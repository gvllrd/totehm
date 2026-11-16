#!/bin/bash
# Sonde anonyme : ce qu'un visiteur SANS compte obtient en passant l'identifiant d'un membre. Compte seulement, jamais le contenu.
cd "$(dirname "$0")/../.."
ANON=$(grep -o "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*" com/monetize.html | head -1)
U=https://abujjbkbbiumxrokozph.supabase.co/rest/v1
ID="$1"
n(){ python3 -c "
import sys,json
t=sys.stdin.read()
try:
    d=json.loads(t)
    if isinstance(d,list): print('lignes:',len(d))
    elif isinstance(d,dict) and ('code' in d or 'message' in d): print('REFUS', d.get('code'), (d.get('message') or '')[:70])
    elif isinstance(d,dict): print('objet, clés:',sorted(d.keys())[:8])
    else: print('valeur:',str(d)[:40])
except Exception as e: print('brut:',t[:80])
"; }
rpc(){ curl -s -m 20 -X POST "$U/rpc/$1" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" -d "$2" | n; }
echo -n "my_habits(p_user)        → "; rpc my_habits "{\"p_user\":\"$ID\"}"
echo -n "_box_shots(p_user)       → "; rpc _box_shots "{\"p_user\":\"$ID\",\"p_kind\":\"habit\",\"p_ref\":\"x\"}"
echo -n "_habit_ints(p_user)      → "; rpc _habit_ints "{\"p_user\":\"$ID\",\"p_habit\":\"x\"}"
echo -n "habit_stats(p_user)      → "; rpc habit_stats "{\"p_user\":\"$ID\",\"p_habit\":\"x\"}"
echo -n "totehm_complete(p_user)  → "; rpc totehm_complete "{\"p_user\":\"$ID\"}"
echo -n "creator_profiles (table) → "; curl -s -m 20 "$U/creator_profiles?select=user_id,payout_handle" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" | n
echo -n "artistic_styles prompts  → "; curl -s -m 20 "$U/artistic_styles?select=name,system_prompt_prefix&limit=3" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" | python3 -c "
import sys,json
d=json.loads(sys.stdin.read())
print('REFUS',d.get('code')) if isinstance(d,dict) else print('lignes:',len(d),'· prompt lisible:',any((x.get('system_prompt_prefix') or '') for x in d))"
echo -n "artistic_styles (boutique) → "; curl -s -m 20 "$U/artistic_styles?select=id,name,image_url,position,status,remaining_capacity,total_capacity&active=eq.true&scope=in.(streetwear,both)&order=position" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" | n
echo -n "signature_styles (vue)   → "; curl -s -m 20 "$U/signature_styles?select=style_name,system_prompt_prefix&limit=3" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" | n
echo -n "figher_cohort (vue)      → "; curl -s -m 20 "$U/figher_cohort?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" | n
echo -n "runs_by_mode (vue)       → "; curl -s -m 20 "$U/runs_by_mode?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" | n
