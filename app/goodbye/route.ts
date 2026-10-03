const goodbyePage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Account deleted | Tied Forever</title>
    <style>
      :root { color-scheme: light; font-family: Arial, sans-serif; background: #fafaf8; color: #1c1c1c; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 20px; box-sizing: border-box; }
      main { width: min(100%, 560px); box-sizing: border-box; padding: 48px 32px; text-align: center; background: white; border: 1px solid #e4e0d4; border-radius: 20px; box-shadow: 0 4px 16px rgba(0,0,0,.06); }
      .mark { width: 48px; height: 48px; margin: 0 auto 24px; display: grid; place-items: center; border-radius: 14px; background: linear-gradient(135deg, #2d5a27, #c4973a); color: white; font-size: 22px; }
      .eyebrow { margin: 0; color: #2d5a27; font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
      h1 { margin: 8px 0 0; font-family: Georgia, serif; font-size: 36px; font-weight: 400; letter-spacing: -.03em; }
      p { margin: 16px auto 0; max-width: 420px; color: #7a7a6e; font-size: 14px; line-height: 1.6; }
      nav { margin-top: 28px; display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
      a { border-radius: 10px; padding: 10px 16px; font-size: 14px; font-weight: 600; text-decoration: none; }
      a:first-child { background: #2d5a27; color: white; }
      a:last-child { border: 1px solid #e4e0d4; background: #f4f4f1; color: #1c1c1c; }
    </style>
  </head>
  <body>
    <main>
      <div class="mark" aria-hidden="true">✦</div>
      <p class="eyebrow">Tied Forever</p>
      <h1>Your account has been deleted</h1>
      <p>Your Tied Forever account and access have been permanently removed.</p>
      <nav>
        <a href="/">Return home</a>
        <a href="/sign-in">Sign in</a>
      </nav>
    </main>
  </body>
</html>`;

export const dynamic = "force-static";

export function GET() {
  return new Response(goodbyePage, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
