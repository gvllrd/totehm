/* ══ LA VIDÉO PART CHEZ BUNNY — copié de tools/bunny_upload.js dans chaque page (jamais importé) ══
   Bunny Stream découpe la vidéo en cinq qualités (240p → 1080p) et la sert en HLS signé depuis le point du CDN le plus
   proche : elle démarre tout de suite et s'adapte au réseau, comme TikTok. L'envoi est TUS : par morceaux de 6 Mo,
   repris après une coupure. Compte pas prêt (`create-bunny-upload` → available:false) : `dispo()` dit non et la page
   garde le seau `moments`. Rend la référence que le serveur attend : 'bunny:<id>'. */
function bunnyEnvoi(sb){
  let pret = null;
  const appel = async (nom, body) => { const { data, error } = await sb.functions.invoke(nom, { body }); if(error) throw error; return data; };
  const dispo = () => pret ||= appel('create-bunny-upload', { action:'status' }).then(d => !!(d && d.available))
    .catch(e => { console.error('[bunny status]', e && e.message || e); pret = null; return false; });
  async function envoyer(blob, secondes, progres){
    const c = await appel('create-bunny-upload', { bytes:blob.size, seconds:secondes });
    const h = { ...c.headers, 'Tus-Resumable':'1.0.0' };
    const meta = 'filetype ' + btoa(blob.type || 'video/mp4') + ',title ' + btoa('Spot ' + c.id);
    const debut = await fetch(c.endpoint, { method:'POST', headers:{ ...h, 'Upload-Length':String(blob.size), 'Upload-Metadata':meta } });
    if(!debut.ok) throw new Error('upload could not start');
    const url = new URL(debut.headers.get('Location'), c.endpoint);
    if(url.origin !== 'https://video.bunnycdn.com') throw new Error('upload address invalid');
    let off = 0, essais = 0;
    while(off < blob.size){
      try{
        const r = await fetch(url, { method:'PATCH', headers:{ ...h, 'Upload-Offset':String(off), 'Content-Type':'application/offset+octet-stream' },
          body:blob.slice(off, off + 6 * 1024 * 1024) });
        if(!r.ok) throw new Error('upload interrupted');
        const n = Number(r.headers.get('Upload-Offset'));
        if(!Number.isFinite(n) || n <= off || n > blob.size) throw new Error('upload offset invalid');
        off = n; essais = 0; if(progres) progres(Math.round(off / blob.size * 100));
      }catch(e){
        if(++essais > 3) throw e;
        await new Promise(r => setTimeout(r, Math.min(4000, essais * 1000)));
        const t = await fetch(url, { method:'HEAD', headers:h });
        if(!t.ok) continue;
        const n = Number(t.headers.get('Upload-Offset')); if(Number.isInteger(n) && n >= 0 && n <= blob.size) off = n;
      }
    }
    const d = await appel('bunny-video', { id:c.id, action:'complete' });
    if(!d || !['processing','ready'].includes(d.status)) throw new Error('video could not be processed');
    return 'bunny:' + c.id;
  }
  return { dispo, envoyer, oublier:() => { pret = null; } };
}
