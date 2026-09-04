export type OtherUser = {
  uid: string;
  name: string | null;
  username: string | null;
  nickname: string | null;
  photo: string | null;
};

export type LastMessage = {
  _id: string;
  messageType: string;
  text: string | null;
  imageUrl: string | null;
  senderId: string;
  createdAt: string;
};

export type Conversation = {
  _id: string;
  participants: string[];
  otherUser: OtherUser;
  lastMessage: LastMessage | null;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  messageType: "text" | "image";
  text: string | null;
  imageUrl: string | null;
  createdAt: string;
  readAt: string | null;
};