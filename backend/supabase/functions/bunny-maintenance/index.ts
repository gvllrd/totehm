// Retired one-off deployment maintenance. No secrets, imports, network or mutations.
Deno.serve(()=>new Response('retired',{status:410,headers:{'Cache-Control':'no-store'}}));
