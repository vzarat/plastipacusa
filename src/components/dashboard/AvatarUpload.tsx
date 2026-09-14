"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  fullName?: string;
  email?: string;
  onAvatarChange?: (avatarUrl: string) => void;
}

export function AvatarUpload({
  currentAvatarUrl,
  fullName,
  email,
  onAvatarChange,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fallbackInitial =
    (fullName?.trim()?.charAt(0) || email?.trim()?.charAt(0) || "U").toUpperCase();

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Unable to identify the current user for avatar upload.");
      }

      const path = `avatars/${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          contentType: file.type || "image/jpeg",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data?.publicUrl;

      if (!publicUrl) {
        throw new Error("Public URL could not be generated for the uploaded image.");
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email,
            avatar_url: publicUrl,
          },
          { onConflict: "id" }
        );

      if (profileError) {
        throw profileError;
      }

      onAvatarChange?.(publicUrl);
      toast.success("Avatar actualizado correctamente");
    } catch (error: any) {
      toast.error(
        error?.message ||
          "No se pudo actualizar el avatar. Verifica que el bucket de almacenamiento exista."
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {currentAvatarUrl ? (
          <img
            src={currentAvatarUrl}
            alt="Profile avatar"
            className="h-16 w-16 rounded-full border border-slate-200 object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-blue-600 to-indigo-700 text-xl font-black text-white shadow-sm">
            {fallbackInitial}
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Upload profile image"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Avatar
        </p>
        <p className="text-xs text-slate-500">
          {isUploading ? "Subiendo imagen..." : "Actualizar foto de perfil"}
        </p>
      </div>
    </div>
  );
}
