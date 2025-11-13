import { Badge } from "@/components/ui/badge";
import { Phone, PhoneCall } from "lucide-react";

interface CallingIndicatorProps {
  isVisible: boolean;
  targetUserName: string;
}

const CallingIndicator = ({
  isVisible,
  targetUserName,
}: CallingIndicatorProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge
        variant="default"
        className="bg-green-500 hover:bg-green-500 text-white px-4 py-2 text-sm font-medium animate-pulse"
      >
        <PhoneCall className="w-4 h-4 mr-2 animate-bounce" />
        Calling {targetUserName}...
      </Badge>
    </div>
  );
};

export default CallingIndicator;
