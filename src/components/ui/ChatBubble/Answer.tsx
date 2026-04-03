import ChatBubble from "./ChatBubble";

export default function Answer({ children }: { children: React.ReactNode }) {
  return (
    <ChatBubble role="answer" icon="/icons/answerer.png">
      {children}
    </ChatBubble>
  );
}
