// The six New York works share one order across the wall, accessible list and Discover.
export const OPPOSITES = [
 {id:'totehm',title:'TOTEHM vs Tommy Hilfiger',image:'/assets/totehmvstommy.png',action:'Create my TOTEHM',href:'https://www.totehm.com/totehm',slides:[
  ['THE DESIGNER SIGNED THE GARMENT. WHY SHOULD HE SIGN YOUR IDENTITY?'],
  ['Tommy Hilfiger made a name recognizable across the world. That takes vision.','But when you buy a garment to express yourself, why is someone else’s name the first story it tells?'],
  ['A brand can give you a look, a language, a place to belong. But it cannot reflect a life it has never lived.','When someone else’s name speaks first, how much of you can the world see?'],
  ['TOTEHM is a reminder of the way you want to go, especially when you lose sight of it.','It does not hand you an identity. It brings you back to the one you are choosing, step by step.'],
  ['A label can tell the world whose name you bought. Your TOTEHM can remind you where you chose to go.','Wear what points you back to yourself. Then let it meet another’s art.']
 ]},
 {id:'higher',title:'HIGHER vs Supreme',image:'/assets/highervssupreme.png',action:'Create my Streetwear Cloth',href:'https://www.higher.boutique/streetwear',slides:[
  ['SUPREME MADE A CULTURE VISIBLE.','HIGHER MAKES ROOM FOR YOURS TO MEET AN ARTIST’S.'],
  ['Supreme turned a New York street language into a global one. That changed what streetwear could be.','But when a finished cultural code travels everywhere, the person wearing it can disappear inside it.'],
  ['An artist should not become a machine for illustrating your identity. You should not become a billboard for the artist.','Each brings a place, a history and a point of view. The work gets stronger when neither has to surrender theirs.'],
  ['HIGHER SOUNDS LIKE AILLEURS IN FRENCH: “SOMEWHERE ELSE.” That place is where two worlds meet.','In HIGHER Streetwear, choose a garment and an artistic style; bring a box from your TOTEHM. The artist’s language gives your story a form neither could have made alone.'],
  ['SAME STREETWEAR. OPPOSITE RELATIONSHIP.','The artist is seen. The wearer is heard. Culture and individual finally share the same garment. Create your Streetwear Cloth.']
 ]},
 {id:'get-higher',title:'GET HIGHER vs Just Do It',image:'/assets/getHighervsJustdoit.png',action:'Experience GET HIGHER',href:'/get_higher?paper=1',slides:[
  ['JUST DO IT. EVEN WHEN THE THING YOU’RE ABOUT TO DO IS THE THING YOU NEED TO CHANGE?'],
  ['Nike gave hesitation a powerful answer: act. But our lives are already crowded with action.','We can move all day and still be driven by fear, anger or a habit we wish we could break.'],
  ['The Stoner Method takes its name from a stepping stone.','A thought, feeling or action that pulls you down becomes a cue: notice it, interrupt the pattern and choose a constructive opposite.'],
  ['A TotehmPaper {THP} opens The Stoner Experience. Through art informed by neuroscience and EEG research, it invites you to practise attention, breath, intention, action—and pleasure in the process.'],
  ['JUST DO IT STARTS A MOVEMENT. GET HIGHER CHANGES THE MOVEMENT YOU CHOOSE.','Turn the downward impulse into a step up. Your next move is where the future begins.']
 ]},
 {id:'world',title:'MAKE THE WORLD HIGHER AGAIN vs Make America Great Again',image:'/assets/makeworldHigher.png',action:'Build my TOTEHM',href:'https://www.totehm.com/totehm',slides:[
  ['GREAT AGAIN IS FEAR SPEAKING IN THE PAST TENSE.','HIGHER AGAIN IS LIFE MOVING FORWARD.'],
  ['The ego fears what it cannot predict. It clings to a world it already knows and calls that safety “greatness.”','But life keeps changing. No one can make yesterday fit a future that has not happened yet.'],
  ['The crises are real. So is the progress we forget to see: more knowledge, more possibilities, more people able to shape their lives.','Progress is unfinished. That is an invitation to invent, with freedom and joy, instead of freezing in fear.'],
  ['This is no political campaign. Politics becomes the problem when it asks us to wait for a leader to restore a world that has already gone.','Your TOTEHM gives your direction a form. GET HIGHER asks what you can change in your very next thought, feeling and action.'],
  ['A FREE PERSON DOES NOT NEED A RULER TO TELL THEM WHO TO BECOME.','Imagine a world where each person seeks to GET HIGHER instead of merely JUST DO IT. Again means choosing the next step, together, as often as life changes.']
 ]},
 {id:'figher',title:'FIGHER CLUB vs Fight Club',image:'/assets/figherclub.png',action:'Find or create a spot',href:'https://www.figher.club/',slides:[
  ['FIGHT CLUB UNDERSTOOD THE EMPTINESS.','DESTRUCTION WAS THE WRONG PLACE TO SEND ITS ENERGY.'],
  ['You can buy everything you were told to want and still feel absent from your own life. Fight Club gives that anger a body.','But when anger is all that holds people together, breaking things becomes easier than building anything.'],
  ['The THP asks one person to turn a destructive impulse into an intentional move.','FIGHER CLUB brings people together through habits and intentions they choose to live—not merely declare.'],
  ['Picture ten people focused on building their own businesses in the same room. Each keeps their own ambition.','Their shared presence can intensify the focus, courage and commitment each brought alone.'],
  ['SAME REFUSAL TO LIVE NUMB. OPPOSITE USE OF FORCE.','One path spends its energy on what it can destroy. The other asks what that energy could build between us. What will keep us taking the next step?']
 ]},
 {id:'ehm',title:'EHM vs H&M',image:'/assets/ehmvshm.png',action:'Create my TOTEHM Cloth',href:'https://www.higher.boutique/streetwear',slides:[
  ['H&M. EHM. A FEW MARKS APART.','TWO COMPLETELY DIFFERENT USES OF A BRAND.'],
  ['H&M is a name to recognize.','Hidden inside TOTEHM, EHM is a meaning to discover.'],
  ['EHM sounds like aime in French: “love.” Stack the Hs vertically and they form a ladder.','Hear the word. See the climb. LOVE EVERY STEP.'],
  ['A symbol matters when it enters your life. The THP opens The Stoner Experience: the moment that pulls you down can become a stepping stone toward your constructive opposite.','The ladder is something you practise, not merely something you see.'],
  ['A LOGO CAN ASK YOU TO LOVE A BRAND. EHM ASKS YOU TO LOVE THE CLIMB.','TOTEHM reminds you who is climbing. GET HIGHER changes the next step. HIGHER gives it artistic form. FIGHER CLUB gives it collective force. MAKE THE WORLD HIGHER AGAIN.']
 ]}
];
export const oppositeById=id=>OPPOSITES.find(work=>work.id===id);
