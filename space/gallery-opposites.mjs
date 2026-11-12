// The six New York works share one order across the wall, accessible list and Discover.
export const OPPOSITES = [
 {id:'totehm',title:'TOTEHM vs Tommy Hilfiger',image:'/assets/totehmvstommy.png',action:'Create my TOTEHM',href:'https://www.totehm.com/totehm',slides:[
  ['HIS NAME. YOUR BODY.','YOUR STORY. YOUR TOTEHM.'],
  ['Tommy Hilfiger turned a designer’s name into something millions want to wear.','But when his name speaks louder than yours, whose identity are you expressing?'],
  ['You bought a garment. You became an advertisement.','The design may be yours to choose. The identity on it is already written.'],
  ['TOTEHM reverses the relationship. Build it from your habits, objectives, repulsions, visions and story.','Then give that identity a physical form through HIGHER. The wearer becomes the author.'],
  ['STOP WEARING SOMEBODY ELSE’S NAME AS YOUR IDENTITY.','BUILD YOUR OWN. WEAR WHAT YOU ARE BECOMING.']
 ]},
 {id:'higher',title:'HIGHER vs Supreme',image:'/assets/highervssupreme.png',action:'Explore HIGHER',href:'https://www.higher.boutique/',slides:[
  ['SUPREME CLAIMS THE TOP.','HIGHER KEEPS THE CLIMB OPEN.'],
  ['Supreme made one New York street history a global reference. That history matters.','But why should one city’s codes become everyone else’s uniform?'],
  ['Who decides which streets count, which artists matter, which voices get seen?','A small circle can make a culture visible. It cannot own the imagination of everyone outside it.'],
  ['HIGHER makes room for the artist in New York, Lagos, Lisbon or Tokyo to speak in their own visual language.','Turn an element of your own TOTEHM into original art you can wear. No borrowed postcode required.'],
  ['THE STREET IS NOT ONE CITY’S PROPERTY.','SUPREME IS A STATUS. HIGHER IS A MOVEMENT.']
 ]},
 {id:'get-higher',title:'GET HIGHER vs Just Do It',image:'/assets/getHighervsJustdoit.png',action:'Experience GET HIGHER',href:'/get_higher',slides:[
  ['JUST DO IT.','DO WHAT? AND WHY?'],
  ['Nike gave the world a starting gun. Stop hesitating. Move.','But a starting gun cannot tell you where to run.'],
  ['EEG makes the question more interesting, not simpler: beta is involved in active thought and movement; alpha can help regulate attention.','Neither band guarantees excellence. You can execute the wrong pattern faster and call it progress.'],
  ['GET HIGHER starts before the move: filter the noise, gather attention, choose an intention. Then perform.','Explore TotehmPaper and the Stoner Experience to put that preparation into practice.'],
  ['JUST DO IT DEMANDS ACTION.','GET HIGHER ASKS YOU TO OWN THE MIND BEHIND IT.']
 ]},
 {id:'world',title:'MAKE THE WORLD HIGHER vs Make America Great Again',image:'/assets/makeworldHigher.png',action:'Build my TOTEHM',href:'https://www.totehm.com/totehm',slides:[
  ['MAKE AMERICA GREAT AGAIN.','MAKE THE WORLD HIGHER.'],
  ['One slogan promises a return to greatness.','Which past? Great for whom? Who gets to decide that yesterday is the destination?'],
  ['Its horizon is one nation. Human potential does not stop at its border.','Elevating one people should not require putting another beneath them.'],
  ['A future worth building starts with choices you can make: a vision, an objective, habits you practise.','Create your TOTEHM. Add your part to a world where different people rise on their own terms.'],
  ['GREATNESS IS NOT A NATIONAL POSSESSION.','IT IS A HUMAN POSSIBILITY. BUILD FORWARD.']
 ]},
 {id:'figher',title:'FIGHER CLUB vs Fight Club',image:'/assets/figherclub.png',action:'Find or create a spot',href:'https://www.figher.club/',slides:[
  ['FIGHT CLUB: DESTROY TO FEEL ALIVE.','FIGHER CLUB: BUILD A REASON TO SHOW UP.'],
  ['Fight Club saw the emptiness of an identity assembled from purchases.','Then its rebellion became another uniform, another script, another set of orders.'],
  ['Destroying the identity handed to you does not tell you who to become.','If rebellion only teaches you to break yourself, the emptiness wins again.'],
  ['FIGHER turns refusal into practice. Fight your inertia, your borrowed habits, your old pattern.','Find or create a spot. Give a habit a place, a time and people you can meet there.'],
  ['THE OPPONENT IS THE PATTERN.','THE PERSON IS WORTH BUILDING. FIRST RULE: SHOW UP.']
 ]},
 {id:'ehm',title:'EHM vs H&M',image:'/assets/ehmvshm.png',action:'Create my TOTEHM Cloth',href:'https://www.higher.boutique/streetwear',slides:[
  ['H&M: MORE. FASTER. AGAIN.','EHM: LOVE IT ENOUGH TO MEAN IT.'],
  ['Fast fashion makes the next thing easy to want and easy to replace.','The problem is the cycle that keeps asking you to buy again, before you have decided what matters.'],
  ['What happens to the people who make the garment, the intention behind it and the person who wears it?','Fashion can move fast enough to forget all three.'],
  ['EHM means LOVE inside TOTEHM: care for the people, the material and the story an object carries.','Choose an element of your TOTEHM. HIGHER turns it into original art to wear.'],
  ['LOVE MORE. CONSUME WITH INTENTION.','CREATE WITH PURPOSE. WEAR YOUR STORY.']
 ]}
];
export const oppositeById=id=>OPPOSITES.find(work=>work.id===id);
