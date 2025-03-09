"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  createUserId,
  validateFullRoomId,
  validatePartialRoomId,
} from "@/lib/room";
import { useRoomStore } from "@/store/room";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

interface JoinFormData {
  roomId: string;
  username: string;
}

export const Join = () => {
  const [isJoining, setIsJoining] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  // const { setRoomId, setUsername, setUserId } = useRoom();
  const setRoomId = useRoomStore((state) => state.setRoomId);
  const setUsername = useRoomStore((state) => state.setUsername);
  const setUserId = useRoomStore((state) => state.setUserId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<JoinFormData>({
    defaultValues: {
      roomId: "",
      username: "",
    },
  });

  const router = useRouter();

  const onSubmit = (data: JoinFormData) => {
    setIsJoining(true);
    // Validate roomId
    if (!validateFullRoomId(data.roomId)) {
      alert("Invalid room ID");
      return;
    }

    console.log("Joining room with data:", data);
    setRoomId(data.roomId);
    setUsername(data.username);
    setUserId(createUserId());
    router.push(`/room/${data.roomId}`);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Join SyncBeat Room</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomId">Room ID</Label>
              <Controller
                control={control}
                name="roomId"
                rules={{ required: "Room ID is required" }}
                render={({ field }) => (
                  <InputOTP
                    autoFocus
                    maxLength={6}
                    inputMode="numeric"
                    value={field.value}
                    onChange={(value) => {
                      // Only set the value if it contains only digits
                      if (validatePartialRoomId(value)) {
                        field.onChange(value);
                        // Focus the username input after OTP is complete
                        if (value.length === 6 && usernameInputRef.current) {
                          usernameInputRef.current.focus();
                        }
                      }
                    }}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                )}
              />
              {errors.roomId && (
                <p className="text-sm text-red-500">{errors.roomId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Choose a username"
                {...register("username", { required: "Username is required" })}
                ref={(element) => {
                  // Need to do both
                  register("username").ref(element);
                  usernameInputRef.current = element;
                }}
              />
              {errors.username && (
                <p className="text-sm text-red-500">
                  {errors.username.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isJoining}>
              {isJoining ? "Joining..." : "Join Room"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
