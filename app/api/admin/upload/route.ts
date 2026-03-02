import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const imgbbKey = process.env.IMGBB_API_KEY;
  if (imgbbKey) {
    const buf = await file.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    const fd = new FormData();
    fd.append("image", base64);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, { method: "POST", body: fd });
    const data = await res.json();
    if (data.success) {
      const url = data.data?.image?.url ?? data.data?.url;
      if (url) return NextResponse.json({ url });
    }
    return NextResponse.json({ error: data.error?.message || "ImgBB upload failed" }, { status: 500 });
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (cloudName && uploadPreset) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const data = await res.json();
    return NextResponse.json({ url: data.secure_url });
  }

  return NextResponse.json({ error: "No image upload configured. Add IMGBB_API_KEY or Cloudinary vars." }, { status: 500 });
}
