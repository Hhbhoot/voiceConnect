import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Phone,
  User,
  Volume2,
  Mic,
  Bell,
  Shield,
  Info,
  Settings as SettingsIcon,
} from "lucide-react";
import { authService, type User } from "@/services/auth";

const Settings = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [micVolume, setMicVolume] = useState([80]);
  const [speakerVolume, setSpeakerVolume] = useState([90]);
  const [autoAnswer, setAutoAnswer] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate("/");
      return;
    }
    setCurrentUser(user);

    // Load settings from localStorage
    const savedSettings = localStorage.getItem("voiceconnect-settings");
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setNotifications(settings.notifications ?? true);
      setMicVolume([settings.micVolume ?? 80]);
      setSpeakerVolume([settings.speakerVolume ?? 90]);
      setAutoAnswer(settings.autoAnswer ?? false);
    }
  }, [navigate]);

  const saveSettings = () => {
    const settings = {
      notifications,
      micVolume: micVolume[0],
      speakerVolume: speakerVolume[0],
      autoAnswer,
    };
    localStorage.setItem("voiceconnect-settings", JSON.stringify(settings));
  };

  useEffect(() => {
    saveSettings();
  }, [notifications, micVolume, speakerVolume, autoAnswer]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                <SettingsIcon className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Section */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={currentUser?.avatar} />
                <AvatarFallback className="text-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                  {currentUser?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentUser?.username}
                </h3>
                <p className="text-gray-500">Online</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audio Settings */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Volume2 className="w-5 h-5" />
              <span>Audio Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Microphone Volume */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4 text-gray-600" />
                <Label>Microphone Volume</Label>
                <span className="text-sm text-gray-500 ml-auto">
                  {micVolume[0]}%
                </span>
              </div>
              <Slider
                value={micVolume}
                onValueChange={setMicVolume}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <Separator />

            {/* Speaker Volume */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-gray-600" />
                <Label>Speaker Volume</Label>
                <span className="text-sm text-gray-500 ml-auto">
                  {speakerVolume[0]}%
                </span>
              </div>
              <Slider
                value={speakerVolume}
                onValueChange={setSpeakerVolume}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Call Settings */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="w-5 h-5" />
              <span>Call Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Enable Notifications</Label>
                <p className="text-sm text-gray-500">
                  Get notified about incoming calls
                </p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Auto Answer</Label>
                <p className="text-sm text-gray-500">
                  Automatically answer incoming calls
                </p>
              </div>
              <Switch checked={autoAnswer} onCheckedChange={setAutoAnswer} />
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Privacy & Security</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>End-to-End Encryption</Label>
                <p className="text-sm text-gray-500">All calls are encrypted</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Call History</Label>
                <p className="text-sm text-gray-500">
                  Stored locally on your device
                </p>
              </div>
              <Button variant="outline" size="sm">
                Clear History
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="w-5 h-5" />
              <span>About</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <strong>VoiceConnect</strong> v1.0.0
              </p>
              <p>
                A modern voice calling application built with React and WebRTC
              </p>
              <p>© 2024 VoiceConnect. All rights reserved.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
