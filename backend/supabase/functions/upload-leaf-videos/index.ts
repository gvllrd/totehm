import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VIDEOS = [
  { filename: "step_0_init.mp4",           path: "steps/step_0_init.mp4" },
  { filename: "step_1_trigger_repulse.mp4", path: "steps/step_1_trigger_repulse.mp4" },
  { filename: "step_2_just_breath.mp4",     path: "steps/step_2_just_breath.mp4" },
  { filename: "step_3_amplify_breath.mp4",  path: "steps/step_3_amplify_breath.mp4" },
  { filename: "step_4_full_awareness.mp4",  path: "steps/step_4_full_awareness.mp4" },
];

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const formData = await req.formData();
  const results: Record<string, unknown>[] = [];

  for (const { filename, path } of VIDEOS) {
    const file = formData.get(filename) as File | null;
    if (!file) {
      results.push({ filename, status: "skipped", reason: "not in form data" });
      continue;
    }

    const arrayBuffer = await file.arrayBuffer();
    const { error } = await supabase.storage
      .from("leaf")
      .upload(path, arrayBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (error) {
      results.push({ filename, path, status: "error", error: error.message });
    } else {
      const { data: urlData } = supabase.storage.from("leaf").getPublicUrl(path);
      results.push({ filename, path, status: "ok", url: urlData.publicUrl });
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
