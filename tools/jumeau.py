# -*- coding: utf-8 -*-
"""LES DEUX JUMEAUX SONT RENTRES — 16/09/2026

Ce script derivait `wisdom.html` (rouge-violet) et `vision.html` (bleu
clair) depuis `com/totehm.html`. Les deux fichiers n'existent plus : ce
sont deux VUES du Totehm, au meme titre que les habitudes, les objectifs
et les repulsions.

POURQUOI ON LES A FUSIONNES
Deux copies de 280 ko pour afficher une liste de plus. Chaque copie
embarquait son `createClient`, sa verification de session, ses SVG de
logo -- et surtout sa PROPRE SESSION de navigation : ouvrir sa sagesse
voulait dire quitter le document, donc perdre la boite ouverte, le
filtre, le classement en cours. Trois bugs signales par Wah sur ces deux
fichiers venaient tous de la, et aucun n'etait un bug de code : c'etait
l'architecture qui les produisait.

CE QUI REMPLACE CE SCRIPT
Rien. Il n'y a plus rien a deriver. `com/totehm.html` porte les cinq
objets, et la croix (`#views`) les donne tous au doigt.

Le fichier reste ici, vide de son moteur, pour que celui qui cherchera
`jumeau.py` dans l'historique tombe sur cette explication plutot que sur
un script mort qui ecraserait deux fichiers supprimes.
"""
import sys
sys.exit(
    "jumeau.py ne sert plus : wisdom.html et vision.html sont devenus\n"
    "deux vues de com/totehm.html le 16/09/2026. Rien a deriver.\n"
    "Voir CLAUDE.md, section « Les cinq objets »."
)
