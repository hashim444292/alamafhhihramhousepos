import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { signAccessToken } from "@/lib/jwt";
import { RegisterSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { fullName, username, email, password, role } = parsed.data;

    // Check if username already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { username: username.toLowerCase() },
          ...(email ? [{ email: email.toLowerCase() }] : []),
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            existingUser.username.toLowerCase() === username.toLowerCase()
              ? "This username is already taken. Please choose another."
              : "This email is already registered.",
        },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user in database
    const newUser = await db.user.create({
      data: {
        fullName,
        username: username.toLowerCase().trim(),
        email: email ? email.toLowerCase().trim() : null,
        passwordHash,
        role: role || "CASHIER",
        isActive: true,
      },
    });

    // Sign JWT access token
    const token = await signAccessToken({
      id: newUser.id,
      username: newUser.username,
      fullName: newUser.fullName,
      role: newUser.role as "ADMIN" | "MANAGER" | "CASHIER",
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Account created successfully!",
        user: {
          id: newUser.id,
          username: newUser.username,
          fullName: newUser.fullName,
          role: newUser.role,
          email: newUser.email,
        },
        token,
      },
      { status: 201 }
    );

    // Set HTTP-only session cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 12, // 12 hours
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("Register API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create account" },
      { status: 500 }
    );
  }
}
