import axios from "axios";
import { useState } from "react";
import { toast } from "react-toastify";
import { uploadMedia } from "@/firebase/uploadMedia";
import { Camera, Heart, MessageCircle, Share2, Trash2 } from "lucide-react";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";


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
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const [limit, setLimit] = useState<FriendLimit | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // Comments open/toggle state
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
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://internshala-clone-y2p2.onrender.com";
    const res = await axios.get(
      `${API_BASE}/api/public/friends/count?userId=` + encodeURIComponent(userId)
    );
    setLimit(res.data);
  }

  async function fetchFeed() {
    setLoadingFeed(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://internshala-clone-y2p2.onrender.com";
      const res = await axios.get(`${API_BASE}/api/public/posts?limit=20` + (userId ? "&userId=" + encodeURIComponent(userId) : ""));

      setPosts(res.data.posts || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e.message || "Failed to load feed");
    } finally {
      setLoadingFeed(false);
    }
  }

  // Initial load
  // NOTE: run once using useEffect to avoid render loops (Next.js build executes renders).
  useState(() => {
    return true;
  });



  async function handleCreatePost() {
    if (!userId) {
      toast.error("Please login to post.");
      return;
    }
    if (!file) {
      toast.error("Select an image/video.");
      return;
    }

    // optimistic local UX hint based on last fetched limit
    if (limit && limit.allowedPerDay !== Infinity && limit.allowedPerDay <= 0) {
      toast.error("You can’t post yet. Add friends to start.");
      return;
    }

    try {
      setCreating(true);
      const { mediaType, mediaUrl } = await uploadMedia(file);

      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://internshala-clone-y2p2.onrender.com";
      const res = await axios.post(`${API_BASE}/api/public/posts`, {
        userId,
        name: currentUser?.displayName || currentUser?.name || "",
        photo: currentUser?.photo || "",
        caption,
        mediaType,
        mediaUrl,
      });

      toast.success("Posted successfully");
      setCaption("");
      setFile(null);
      setPosts((prev) => [res.data, ...prev]);

      await fetchLimit();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e.message || "Failed to post");
    } finally {
      setCreating(false);
    }
  }

  async function fetchComments(postId: string) {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://internshala-clone-y2p2.onrender.com";
      const res = await axios.get(
        `${API_BASE}/api/public/posts/${postId}/comments`
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
      toast.error("Login required");
      return;
    }
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://internshala-clone-y2p2.onrender.com";
      await axios.post(`${API_BASE}/api/public/posts/` + post._id + `/like`, {
        userId,
      });
      await fetchFeed();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e.message || "Failed");
    }
  }

  async function addComment(postId: string) {
    if (!userId) {
      toast.error("Login required");
      return;
    }
    const text = (commentTextByPostId[postId] || "").trim();
    if (!text) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://internshala-clone-y2p2.onrender.com";
      await axios.post(`${API_BASE}/api/public/posts/${postId}/comments`, {
        postId,
        userId,
        name: currentUser?.displayName || currentUser?.name || "",
        photo: currentUser?.photo || "",
        text,
      });
      toast.success("Comment added");
      setCommentTextByPostId((prev) => ({ ...prev, [postId]: "" }));
      // No GET comments endpoint exists yet; for now reload feed only.
      await fetchFeed();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e.message || "Failed");
    }
  }

  const friendsHint = (() => {
    if (!limit) return "";
    if (limit.friendsCount === 0) return "You can’t post yet. Add friends to start.";
    if (limit.allowedPerDay === Infinity) return "Posting is unlimited for you today.";
    return `You can post ${limit.allowedPerDay} time(s) today.`;
  })();


  return (
    <div className="max-w-5xl mx-auto p-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Public Space</h1>
        <p className="text-gray-600 mt-2">Upload, like, comment, and share with the community.</p>
        {friendsHint && <p className="mt-3 text-sm text-blue-700">{friendsHint}</p>}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Create a post</h2>

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Share something..."
          rows={3}
        />

        <div className="flex items-center gap-3 mt-3">
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm">
            <Camera size={16} />
            <span>{file ? file.name : "Upload image/video"}</span>
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          {file && (
            <button
              className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm text-red-600"
              onClick={() => setFile(null)}
              type="button"
            >
              <Trash2 size={16} />
              Remove
            </button>
          )}
        </div>

        <button
          disabled={creating || !file}
          onClick={handleCreatePost}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl"
          type="button"
        >
          {creating ? "Posting..." : "Post"}
        </button>
      </div>

      <div className="space-y-4">
        {loadingFeed && <div className="text-gray-500">Loading feed...</div>}

        {!loadingFeed && posts.length === 0 && (
          <div className="text-gray-500 bg-white rounded-2xl shadow-sm p-6">No posts yet.</div>
        )}

        {posts.map((post) => (
          <div key={post._id} className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-start gap-3">
              <img
                src={post.author?.photo || "/logo.png"}
                alt={post.author?.name || "user"}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{post.author?.name || "User"}</div>
                    <div className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                {post.caption && <p className="text-gray-800 mt-2 whitespace-pre-wrap">{post.caption}</p>}

                {post.media?.mediaType === "video" ? (
                  <video src={post.media.url} controls className="mt-3 w-full max-h-105 rounded-xl" />
                ) : (
                  <img src={post.media?.url} className="mt-3 w-full rounded-xl" alt="post" />
                )}

                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => toggleLike(post)}
                    className="inline-flex items-center gap-2 text-gray-700 hover:text-blue-600 text-sm"
                    type="button"
                  >
                    <Heart size={16} />
                    Like
                  </button>

                  <button
                    onClick={async () => {
                      setExpandedComments((prev) => ({
                        ...prev,
                        [post._id]: !prev[post._id],
                      }));
                      // fetch when opening
                      if (!expandedComments[post._id]) {
                        await fetchComments(post._id);
                      }
                    }}
                    className="inline-flex items-center gap-2 text-gray-700 hover:text-blue-600 text-sm"
                    type="button"
                  >
                    <MessageCircle size={16} />
                    Comment{typeof post.commentsCount === "number" ? ` (${post.commentsCount})` : ""}
                  </button>


                  <button
                    onClick={async () => {
                      const url = window.location.href;
                      try {
                        if (navigator.share) {
                          // @ts-ignore
                          await navigator.share({ title: "Post", url });
                        } else {
                          await navigator.clipboard.writeText(url);
                          toast.success("Link copied");
                        }
                      } catch {
                        toast.error("Share failed");
                      }
                    }}
                    className="ml-auto inline-flex items-center gap-2 text-gray-700 hover:text-blue-600 text-sm"
                    type="button"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                </div>

                {expandedComments[post._id] && (
                  <div className="mt-3">
                    {(commentsByPostId[post._id] || []).length > 0 && (
                      <div className="space-y-2 mb-2">
                        {(commentsByPostId[post._id] || []).map((c: any) => (
                          <div key={c._id} className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">
                            <div className="font-medium text-gray-900">{c.author?.name || "User"}</div>
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
                      placeholder="Write a comment..."
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
                      Add comment
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

