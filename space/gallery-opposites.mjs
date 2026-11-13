// The six New York works share one order across the wall, accessible list and Discover.
export const OPPOSITES = [
 {id:'totehm',title:'TOTEHM vs Tommy Hilfiger',image:'/assets/totehmvstommy.png',action:'Create my TOTEHM',href:'https://www.totehm.com/totehm',slides:[
  ['THE DESIGNER SIGNED THE GARMENT. WHY SHOULD HE SIGN YOUR IDENTITY?'],
  ['Tommy Hilfiger made a name recognizable across the world. That takes vision.','But when you buy a garment to express yourself, why is someone else’s name the first story it tells?'],
  ['A brand can give you a look, a language, a place to belong. It cannot write your ambitions for you.','The person inside the garment has a life the label has never lived.'],
  ['TOTEHM is a symbol filled from within: habits, objectives, refusals, visions, story.','A totem for decisions you make, not a monument to the person who founded the brand.'],
  ['A name can tell the world whose label you bought. Your TOTEHM can tell you what you’re building.','Own your story. Then let it meet another’s art.']
 ]},
 {id:'higher',title:'HIGHER vs Supreme',image:'/assets/highervssupreme.png',action:'Explore HIGHER',href:'https://www.higher.boutique/',slides:[
  ['SUPREME NAMES THE SUMMIT.','HIGHER SOUNDS LIKE AILLEURS IN FRENCH: “SOMEWHERE ELSE.”'],
  ['Supreme made a New York street culture recognizable around the world.','But wearing a famous culture does not necessarily make your own visible.'],
  ['The wearer lives somewhere. The artist creates from somewhere.','Their places and experiences should speak to each other. If either becomes a blank canvas for the other, the work loses half its truth.'],
  ['HIGHER opens the frame to more artists and more lived cultures. The wearer brings an element of their TOTEHM; the artist brings a vision shaped by their own world.','The artwork is born where those worlds meet.'],
  ['SUPREME MADE ONE PLACE A GLOBAL CODE. HIGHER WANTS ARTIST AND WEARER TO CREATE SOMEWHERE ELSE TOGETHER.','Wear a work that can hold your culture—and ask whether you are living what it says.']
 ]},
 {id:'get-higher',title:'GET HIGHER vs Just Do It',image:'/assets/getHighervsJustdoit.png',action:'Experience GET HIGHER',href:'/get_higher',slides:[
  ['JUST DO IT. EVEN WHEN THE THING YOU’RE ABOUT TO DO IS THE THING YOU NEED TO CHANGE?'],
  ['Nike gave hesitation a powerful answer: act. But our lives are already crowded with action.','We can move all day and still be driven by fear, anger or a habit we wish we could break.'],
  ['The Stoner Method takes its name from a stepping stone.','A thought, feeling or action that pulls you down becomes a cue: notice it, interrupt the pattern and choose a constructive opposite.'],
  ['A TotehmPaper {THP} opens The Stoner Experience. Through art informed by neuroscience and EEG research, it invites you to practise attention, breath, intention, action—and pleasure in the process.'],
  ['JUST DO IT STARTS A MOVEMENT. GET HIGHER CHANGES THE MOVEMENT YOU CHOOSE.','Turn the downward impulse into a step up. Your next move is where the future begins.']
 ]},
 {id:'world',title:'MAKE THE WORLD HIGHER AGAIN vs Make America Great Again',image:'/assets/makeworldHigher.png',action:'Build my TOTEHM',href:'https://www.totehm.com/totehm',slides:[
  ['SAME WORD: “AGAIN.”','OPPOSITE DIRECTION IN TIME.'],
  ['“Make America Great Again” draws its force from nostalgia. But which past should return?','And will yesterday’s answers meet tomorrow’s challenges?'],
  ['The crises in the news are real. They are not the whole story. Over time, advances in care, knowledge, rights and the ability to create have expanded what is possible for many people.','That progress is uneven and fragile—which is a reason to keep inventing.'],
  ['MAKE THE WORLD HIGHER AGAIN means begin again—after a setback, after a discovery, after every step forward.','Take what is difficult and make it the starting point for more freedom, invention and joy.'],
  ['IMAGINE A WORLD WHERE PEOPLE SEEK TO GET HIGHER INSTEAD OF SIMPLY JUST DO IT.','One person can change a move. A future takes people choosing their moves together.']
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
