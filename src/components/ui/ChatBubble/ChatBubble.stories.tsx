import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ChatBubble from './ChatBubble';
import Question from './Question';
import Answer from './Answer';

const meta: Meta<typeof ChatBubble> = {
  title: 'UI/ChatBubble',
  component: ChatBubble,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    role: {
      control: { type: 'select' },
      options: ['question', 'answer'],
    },
    icon: {
      control: { type: 'text' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的な質問バブル
export const QuestionBubble: Story = {
  args: {
    role: 'question',
    icon: '/icons/questioner.png',
    children: '公務員の退職金制度について教えてください。',
  },
};

// 基本的な回答バブル
export const AnswerBubble: Story = {
  args: {
    role: 'answer',
    icon: '/icons/answerer.png',
    children: '公務員の退職金制度は、在職期間や職種によって異なります。基本的には在職年数に応じて計算され、退職時に一括で支給されます。',
  },
};

// 長いテキストの質問
export const LongQuestion: Story = {
  args: {
    role: 'question',
    icon: '/icons/questioner.png',
    children: '公務員として働いているのですが、退職金の計算方法や支給時期、税金の扱いについて詳しく知りたいです。また、早期退職した場合の減額についても教えてください。',
  },
};

// 長いテキストの回答
export const LongAnswer: Story = {
  args: {
    role: 'answer',
    icon: '/icons/answerer.png',
    children: '公務員の退職金は、基本給の月額に在職年数を掛けた金額を基準に計算されます。支給時期は退職から約3ヶ月後で、退職所得控除の適用により税負担が軽減されます。早期退職の場合は、在職年数に応じて減額されることがあります。',
  },
};

// 会話の流れを表現
export const Conversation: Story = {
  render: () => (
    <div className="w-full max-w-2xl space-y-4">
      <Question>
        公務員の退職金制度について教えてください。
      </Question>
      <Answer>
        公務員の退職金制度は、在職期間や職種によって異なります。基本的には在職年数に応じて計算され、退職時に一括で支給されます。
      </Answer>
      <Question>
        具体的な計算方法はどのようになっていますか？
      </Question>
      <Answer>
        退職金は、基本給の月額に在職年数を掛けた金額を基準に計算されます。例えば、基本給が30万円で20年在職した場合、30万円 × 20年 = 600万円程度が目安となります。
      </Answer>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

// ダークモード対応の確認
export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-900 p-8 rounded-sm">
      <div className="space-y-4">
        <Question>
          ダークモードでの表示はどうなりますか？
        </Question>
        <Answer>
          現在の実装では、ダークモードのスタイルは適用されていませんが、Tailwind CSSのdark:プレフィックスを使用して対応可能です。
        </Answer>
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};
