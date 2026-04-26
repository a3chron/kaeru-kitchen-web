import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("recipes-hub")
      .select("*")
      .gt("flags", 0)
      .order("flags", { ascending: false });

    if (error) {
      console.error("Error fetching flagged recipes:", error);
      return NextResponse.json(
        { error: "Failed to fetch flagged recipes" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      recipes: data || [],
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
