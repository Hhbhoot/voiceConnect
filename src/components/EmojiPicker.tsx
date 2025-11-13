import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Smile, Search } from "lucide-react";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onEmojiSelect,
  className = "",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Emoji categories with popular emojis
  const emojiCategories = {
    "😀 Smileys": [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "🤣",
      "😂",
      "🙂",
      "🙃",
      "😉",
      "😊",
      "😇",
      "🥰",
      "😍",
      "🤩",
      "😘",
      "😗",
      "😚",
      "😙",
      "😋",
      "😛",
      "😜",
      "🤪",
      "😝",
      "🤑",
      "🤗",
      "🤭",
      "🤫",
      "🤔",
      "🤐",
      "🤨",
      "😐",
      "😑",
      "😶",
      "😏",
      "😒",
      "🙄",
      "😬",
      "🤥",
      "😔",
      "😪",
      "🤤",
      "😴",
      "😷",
      "🤒",
      "🤕",
      "🤢",
      "🤮",
      "🤧",
      "🥵",
      "🥶",
      "🥴",
      "😵",
      "🤯",
      "🤠",
      "🥳",
      "😎",
      "🤓",
      "🧐",
    ],
    "❤️ Hearts": [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💔",
      "❣️",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "💟",
    ],
    "👋 Gestures": [
      "👋",
      "🤚",
      "🖐️",
      "✋",
      "🖖",
      "👌",
      "🤏",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "🖕",
      "👇",
      "☝️",
      "👍",
      "👎",
      "✊",
      "👊",
      "🤛",
      "🤜",
      "👏",
      "🙌",
      "👐",
      "🤲",
      "🤝",
      "🙏",
    ],
    "🎉 Objects": [
      "🎉",
      "🎊",
      "🎈",
      "🎁",
      "🎀",
      "🎂",
      "🎃",
      "🎄",
      "🎆",
      "🎇",
      "🧨",
      "✨",
      "🎋",
      "🎍",
      "🎎",
      "🎏",
      "🎐",
      "🎑",
      "🧧",
      "🎗️",
      "🎟️",
      "🎫",
      "🎖️",
      "🏆",
      "🏅",
      "🥇",
      "🥈",
      "🥉",
      "⚽",
      "⚾",
      "🥎",
      "🏀",
      "🏐",
      "🏈",
      "🏉",
      "🎾",
    ],
    "🍕 Food": [
      "🍎",
      "🍊",
      "🍋",
      "🍌",
      "🍉",
      "🍇",
      "🍓",
      "🍈",
      "🍒",
      "🍑",
      "🥭",
      "����",
      "🥥",
      "🥝",
      "🍅",
      "🍆",
      "🥑",
      "🥦",
      "🥬",
      "🥒",
      "🌶️",
      "🌽",
      "🥕",
      "🧄",
      "🧅",
      "🥔",
      "🍠",
      "🥐",
      "🥖",
      "🍞",
      "🥨",
      "🥯",
      "🧀",
      "🥚",
      "🍳",
      "🧈",
      "🥞",
      "🧇",
      "🥓",
      "🥩",
      "🍗",
      "🍖",
      "🦴",
      "🌭",
      "🍔",
      "🍟",
      "🍕",
      "🌮",
    ],
    "⭐ Symbols": [
      "⭐",
      "🌟",
      "✨",
      "💫",
      "☀️",
      "🌙",
      "⭐",
      "🌍",
      "🌎",
      "🌏",
      "💥",
      "🔥",
      "💧",
      "🌊",
      "❄️",
      "⛄",
      "☁️",
      "🌈",
      "⚡",
      "☄️",
      "💎",
      "🔮",
      "💰",
      "💸",
      "💳",
      "💴",
      "💵",
      "💶",
      "💷",
      "🏧",
      "💹",
      "💱",
      "💲",
      "✅",
      "❌",
      "❓",
    ],
  };

  // Filter emojis based on search
  const filteredCategories = Object.entries(emojiCategories).reduce(
    (acc, [category, emojis]) => {
      if (!searchQuery) {
        acc[category] = emojis;
      } else {
        const filtered = emojis.filter(() =>
          category.toLowerCase().includes(searchQuery.toLowerCase()),
        );
        if (filtered.length > 0) {
          acc[category] = filtered;
        }
      }
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`text-gray-500 h-6 w-6 p-0 ${className}`}
        >
          <Smile className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="top" align="end">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search emojis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-8"
            />
          </div>
        </div>

        <ScrollArea className="h-64">
          <div className="p-3">
            {Object.entries(filteredCategories).map(([category, emojis]) => (
              <div key={category} className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  {category}
                </h4>
                <div className="grid grid-cols-8 gap-1">
                  {emojis.map((emoji, index) => (
                    <button
                      key={`${emoji}-${index}`}
                      onClick={() => handleEmojiClick(emoji)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-lg"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {Object.keys(filteredCategories).length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Smile className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No emojis found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
