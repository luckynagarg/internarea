import { useEffect, useRef, useState } from "react";
import { useT } from '@/i18n/runtime';
import { toast } from "react-toastify";
import { uploadMedia } from "@/firebase/uploadMedia";
import { Camera, Heart, MessageCircle, Share2, Trash2 } from "lucide-react";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import axiosClient from "@/lib/axiosClient";


type FriendLimit = {
  friendsCount: number;
  allowedPerDay: number | typeof Infinity;
};

type Post = {
  _id: string;
  author: { userId: string; name: string; photo: string };
  caption: string;
  media: { mediaType: "image" | "video"; url: string };
  createdAt: string;
  likesCount?: number;
  commentsCount?: number;
};


export default function PublicSpacePage() {
  const { t } = useT();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [limit, setLimit] = useState<FriendLimit | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentTextByPostId, setCommentTextByPostId] = useState<Record<string, string>>({});
  const [commentsByPostId, setCommentsByPostId] = useState<Record<string, any[]>>({});


  const currentUser = useSelector(selectuser);
  const userId = currentUser?.uid || currentUser?.userId || "";



  async function fetchLimit() {
    if (!userId) {
      setLimit({ friendsCount: 0, allowedPerDay: 0 });
      return;
    }
    try {
      const res = await axiosClient.get(`/api/public/friends/count`);
      setLimit(res.data);
    } catch {
      setLimit({ friendsCount: 0, allowedPerDay: 0 });
    }
  }

  async function fetchFeed() {
    setLoadingFeed(true);
    try {
      const res = await axiosClient.get(`/api/public/posts?limit=20`);
      setPosts(res.data.posts || []);
    } catch (e: any) {
      toast.error(t('common.error'));
    } finally {
      setLoadingFeed(false);
    }
  }

  useEffect(() => {
    fetchLimit();
    fetchFeed();
  }, [userId]);





  async function handleCreatePost() {
    if (!userId) {
      toast.error(t('common.pleaseLogin'));
      return;
    }

    const hasMedia = !!file;
    const hasText = caption.trim().length > 0;
    if (!hasMedia && !hasText) {
      toast.error(t('common.selectMedia'));
      return;
    }

    if (limit && limit.allowedPerDay !== Infinity && limit.allowedPerDay <= 0) {
      toast.error(t('public.cantPost'));
      return;
    }

    try {
      setCreating(true);

      let mediaType: string = "";
      let mediaUrl: string = "";
      if (file) {
        const uploaded = await uploadMedia(file, 30000, { folder: "public-space" });
        mediaType = uploaded.mediaType;
        mediaUrl = uploaded.mediaUrl;
      }

      const res = await axiosClient.post(`/api/public/posts`, {
        name: currentUser?.displayName || currentUser?.name || "",
        photo: currentUser?.photo || "",
        caption,
        mediaType: mediaType || undefined,
        mediaUrl: mediaUrl || undefined,
      });

      toast.success(t('public.postedSuccessfully'));
      setCaption("");
      setFile(null);
      // Reset the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      const createdPost = res.data?.post ?? res.data;
      if (createdPost && createdPost._id) {
        setPosts((prev) => [createdPost, ...prev.filter((p) => p._id !== createdPost._id)]);
      } else {
        await fetchFeed();
      }

      await fetchLimit();
    } catch (e: any) {
      const message =
        e?.response?.data?.error ??
        e?.response?.data?.message ??
        e?.message ??
        t('common.postingFailed');
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  async function fetchComments(postId: string) {
    try {
      const res = await axiosClient.get(
        `/api/public/posts/${postId}/comments`
      );
      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: res.data.comments || [],
      }));
    } catch {
      // ignore
    }
  }

  async function toggleLike(post: Post) {

    if (!userId) {
      toast.error(t('common.loginRequired'));
      return;
    }
    try {
      await axiosClient.post(`/api/public/posts/${post._id}/like`);
      await fetchFeed();
    } catch (e: any) {
      toast.error(t('common.error'));
    }
  }

  async function addComment(postId: string) {
    if (!userId) {
      toast.error(t('common.loginRequired'));
      return;
    }
    const text = (commentTextByPostId[postId] || "").trim();
    if (!text) return;

    try {
      await axiosClient.post(`/api/public/posts/${postId}/comments`, {
        name: currentUser?.displayName || currentUser?.name || "",
        photo: currentUser?.photo || "",
        text,
      });
      toast.success(t('common.addComment'));
      setCommentTextByPostId((prev) => ({ ...prev, [postId]: "" }));
      await fetchFeed();
    } catch (e: any) {
      toast.error(t('common.error'));
    }
  }

  const friendsHint = (() => {
    if (!limit) return "";
    if (limit.friendsCount === 0) return t('public.cantPost');
    if (limit.allowedPerDay === Infinity) return t('public.postingUnlimited');
    return t('public.canPostTimes', { values: { count: limit.allowedPerDay } });
  })();


  return (
    <div className="max-w-5xl mx-auto p-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('public.pageTitle')}</h1>
        <p className="text-gray-600 mt-2">{t('public.pageDesc')}</p>
        {friendsHint && <p className="mt-3 text-sm text-blue-700">{friendsHint}</p>}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">{t('public.createPost')}</h2>

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('public.shareSomething')}
          rows={3}
        />

        <div className="flex items-center gap-3 mt-3">
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-500 text-black text-sm">
            <Camera size={16} />
            <span>{file ? file.name : t('public.uploadImageVideo')}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          {file && (
            <button
              className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm text-red-600"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              type="button"
            >
              <Trash2 size={16} />
              {t('public.remove')}
            </button>
          )}
        </div>

        <button
          disabled={creating || (!file && !caption.trim())}
          onClick={handleCreatePost}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl"
          type="button"
        >
          {creating ? t('public.posting') : t('public.post')}
        </button>
      </div>

      <div className="space-y-4">
        {loadingFeed && <div className="text-gray-500">{t('public.loadingFeed')}</div>}

        {!loadingFeed && posts.length === 0 && (
          <div className="text-gray-500 bg-white rounded-2xl shadow-sm p-6">{t('public.noPosts')}</div>
        )}

        {posts.map((post) => (
          <div key={post._id} className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-start gap-3">
              <img
                src={post.author?.photo || "/logo.png"}
                alt={post.author?.name || t('common.nA')}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{post.author?.name || t('common.nA')}</div>
                    <div className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                {post.caption && <p className="text-gray-800 mt-2 whitespace-pre-wrap">{post.caption}</p>}

                {post.media?.url ? (
                  post.media?.mediaType === "video" ? (
                    <video src={post.media.url} controls className="mt-3 w-full max-h-[420px] rounded-xl" />
                  ) : (
                    <img src={post.media.url} className="mt-3 w-full rounded-xl" alt={t('public.post')} />
                  )
                ) : null}

                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => toggleLike(post)}
                    className="inline-flex items-center gap-2 text-gray-700 hover:text-blue-600 text-sm"
                    type="button"
                  >
                    <Heart size={16} />
                    {t('public.like')}
                  </button>

                  <button
                    onClick={async () => {
                      setExpandedComments((prev) => ({
                        ...prev,
                        [post._id]: !prev[post._id],
                      }));
                      if (!expandedComments[post._id]) {
                        await fetchComments(post._id);
                      }
                    }}
                    className="inline-flex items-center gap-2 text-gray-700 hover:text-blue-600 text-sm"
                    type="button"
                  >
                    <MessageCircle size={16} />
                    {t('public.comment')}{typeof post.commentsCount === "number" ? ` (${post.commentsCount})` : ""}
                  </button>


                  <button
                    onClick={async () => {
                      const postUrl = `${window.location.origin}/public#post-${post._id}`;
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: t('public.post'), url: postUrl });
                        } else {
                          await navigator.clipboard.writeText(postUrl);
                          toast.success(t('common.linkCopied'));
                        }
                      } catch {
                        toast.error(t('common.shareFailed'));
                      }
                    }}
                    className="ml-auto inline-flex items-center gap-2 text-gray-700 hover:text-blue-600 text-sm"
                    type="button"
                  >
                    <Share2 size={16} />
                    {t('public.share')}
                  </button>
                </div>

                {expandedComments[post._id] && (
                  <div className="mt-3">
                    {(commentsByPostId[post._id] || []).length > 0 && (
                      <div className="space-y-2 mb-2">
                        {(commentsByPostId[post._id] || []).map((c: any) => (
                          <div key={c._id} className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">
                            <div className="font-medium text-gray-900">{c.author?.name || t('common.nA')}</div>
                            <div>{c.text}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <input
                      value={commentTextByPostId[post._id] || ""}
                      onChange={(e) =>
                        setCommentTextByPostId((prev) => ({
                          ...prev,
                          [post._id]: e.target.value,
                        }))
                      }
                      placeholder={t('public.writeComment')}
                      className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={async () => {
                        await addComment(post._id);
                        await fetchComments(post._id);
                      }}
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                      type="button"
                    >
                      {t('public.addComment')}
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
