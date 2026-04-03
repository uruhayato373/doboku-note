import ChatBubble from "./ChatBubble";

export default function Question({ children }: { children: React.ReactNode }) {
  return (
    <ChatBubble role="question" icon="/icons/questioner.png">
      {children}
    </ChatBubble>
  );
}
