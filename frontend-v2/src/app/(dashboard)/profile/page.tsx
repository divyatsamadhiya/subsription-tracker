"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboard } from "@/lib/dashboard-context";
import { api } from "@/lib/api";
import {
  getCountryList,
  getTimezonesForCountry,
  formatTimezoneLabel,
} from "@/lib/country-timezones";
import { getPhoneCode } from "@/lib/country-phone-codes";

const countries = getCountryList();

const MAX_AVATAR_SIZE = 256;

/** Resize an image file to a square data URL (JPEG, max 256×256). */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = MAX_AVATAR_SIZE;
      canvas.height = MAX_AVATAR_SIZE;
      const ctx = canvas.getContext("2d")!;

      // Centre-crop to square
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, MAX_AVATAR_SIZE, MAX_AVATAR_SIZE);

      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function ProfilePage() {
  const { user, refresh } = useDashboard();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Timezone options derived from country
  const timezoneOptions = getTimezonesForCountry(country);

  useEffect(() => {
    if (!user) return;
    setFullName(user.profile?.fullName ?? "");
    setCountry(user.profile?.country ?? "");
    setTimeZone(user.profile?.timeZone ?? "");
    setAvatarUrl(user.profile?.avatarUrl ?? "");
    setBio(user.profile?.bio ?? "");

    // Split stored E.164 phone into code + number
    const raw = user.profile?.phone ?? "";
    if (raw && user.profile?.country) {
      const code = getPhoneCode(user.profile.country);
      if (code && raw.startsWith(code)) {
        setPhoneCode(code);
        setPhoneNumber(raw.slice(code.length));
      } else {
        setPhoneCode(code || "");
        setPhoneNumber(raw.replace(/^\+\d{1,4}/, ""));
      }
    } else {
      setPhoneCode("");
      setPhoneNumber("");
    }
  }, [user]);

  // Auto-select timezone when country has exactly one option
  useEffect(() => {
    if (timezoneOptions.length === 1) {
      setTimeZone(timezoneOptions[0]);
    } else if (
      timezoneOptions.length > 1 &&
      !timezoneOptions.includes(timeZone)
    ) {
      setTimeZone("");
    }
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-set phone code when country changes
  useEffect(() => {
    const code = getPhoneCode(country);
    if (code) setPhoneCode(code);
  }, [country]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      setAvatarUrl(dataUrl);
    } catch {
      // silently ignore invalid images
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const fullPhone = phoneNumber.trim()
        ? `${phoneCode}${phoneNumber.trim()}`
        : undefined;

      await api.updateProfile({
        fullName: fullName.trim(),
        country: country.trim(),
        timeZone: timeZone.trim() || undefined,
        phone: fullPhone,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const initials =
    user?.profile?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "?";

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal information
        </p>
      </motion.div>

      <div className="max-w-2xl space-y-6">
        {/* Avatar header */}
        <motion.div variants={item}>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <button
                type="button"
                className="group relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-semibold text-primary overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="size-5 text-white" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </button>
              <div>
                <p className="font-heading text-lg font-semibold">
                  {user?.profile?.fullName || "Unnamed user"}
                </p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {user?.createdAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Joined{" "}
                    {new Intl.DateTimeFormat(undefined, {
                      month: "long",
                      year: "numeric",
                    }).format(new Date(user.createdAt))}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Form */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Personal information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      minLength={2}
                      maxLength={80}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={country}
                      onValueChange={(v) => setCountry(v ?? "")}
                      required
                    >
                      <SelectTrigger id="country" className="!w-full h-10">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false} className="max-h-60">
                        {countries.map((c) => (
                          <SelectItem key={c.value} value={c.label}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="timeZone">Timezone</Label>
                    {timezoneOptions.length > 0 ? (
                      <Select
                        value={timeZone}
                        onValueChange={(v) => setTimeZone(v ?? "")}
                      >
                        <SelectTrigger id="timeZone" className="!w-full h-10">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          {timezoneOptions.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {formatTimezoneLabel(tz)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="timeZone"
                        placeholder="Enter your country first"
                        value={timeZone}
                        onChange={(e) => setTimeZone(e.target.value)}
                        className="h-10"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <div className="flex gap-2">
                      <div className="w-24 shrink-0">
                        <Input
                          value={phoneCode}
                          readOnly
                          tabIndex={-1}
                          className="h-10 text-center text-muted-foreground bg-muted/50"
                        />
                      </div>
                      <Input
                        id="phone"
                        placeholder="Phone number"
                        value={phoneNumber}
                        onChange={(e) =>
                          setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    placeholder="Tell us a bit about yourself..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={280}
                    rows={3}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                  {saved && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-sm text-success"
                    >
                      Saved
                    </motion.span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
