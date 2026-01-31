import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Phone, Mic, Users, Eye, EyeOff } from "lucide-react";
import { authService } from "@/services/auth";
import { useSocket } from "@/contexts/SocketContext";
import { useToast } from "@/components/ui/use-toast";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { connectSocket } = useSocket();
  const { toast } = useToast();

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password) return;

    setIsLoading(true);
    try {
      const result = await authService.login(
        formData.email.trim(),
        formData.password,
      );

      // Connect to socket after successful login
      connectSocket(result.user);

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Brand Section */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            VoiceConnect
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Crystal clear voice & video calls, anywhere
          </p>
        </div>

        {/* Login Form */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl font-semibold">
              Welcome Back
            </CardTitle>
            <CardDescription>
              Sign in to your VoiceConnect account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="h-10 sm:h-12 text-base"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="h-10 sm:h-12 text-base pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 sm:h-12 text-base bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                disabled={
                  isLoading || !formData.email.trim() || !formData.password
                }
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {/* Register Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-indigo-600 hover:text-indigo-700"
                  onClick={() => navigate("/register")}
                >
                  Create one here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="flex flex-row sm:flex-col items-center justify-center sm:space-y-2 space-x-3 sm:space-x-0 bg-white/50 sm:bg-transparent p-3 sm:p-0 rounded-lg">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            </div>
            <span className="text-sm text-gray-600">HD Audio</span>
          </div>
          <div className="flex flex-row sm:flex-col items-center justify-center sm:space-y-2 space-x-3 sm:space-x-0 bg-white/50 sm:bg-transparent p-3 sm:p-0 rounded-lg">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-600">Video Calls</span>
          </div>
          <div className="flex flex-row sm:flex-col items-center justify-center sm:space-y-2 space-x-3 sm:space-x-0 bg-white/50 sm:bg-transparent p-3 sm:p-0 rounded-lg">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">Instant Connect</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
