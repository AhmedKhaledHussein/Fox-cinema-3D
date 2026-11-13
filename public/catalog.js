export const movies = [
 {id:'hadoota',title:'Hadoota',arabic:'حدوتة',genre:'Drama',language:'Arabic',runtime:110,rating:'G',format:['Standard','MAX'],poster:'poster-hadoota.jpg',coming:false,story:'A close-knit group finds its story changed by an unexpected chapter in their lives.',cast:'Egyptian ensemble cast'},
 {id:'godzilla-minus-zero',title:'Godzilla Minus Zero',arabic:'غودزيلا ناقص صفر',genre:'Horror',language:'Japanese',runtime:135,rating:'12+',format:['Standard','MAX','IMAX','4DX'],poster:'poster-godzilla.jpg',coming:false,story:'War reduced Japan to zero, and Godzilla plunged it into minus. Two years have passed since then, and the country has faced agonizing struggles to achieve recovery and finally reclaim its daily life.',cast:'Minami Hamabe, Ryunosuke Kamiki'},
 {id:'wala-kan-ala-el-bal',title:'Wala Kan Ala El-Bal',arabic:'ولا كان ع البال',genre:'Comedy',language:'Arabic',runtime:90,rating:'G',format:['Standard','GOLD'],poster:'poster-wala.jpg',coming:false,story:'A charming Egyptian comedy about chance meetings and the surprises of everyday life.',cast:'Ensemble cast'},
 {id:'the-cat-in-the-hat',title:'The Cat In The Hat',arabic:'القط ذو القبعة',genre:'Animation',language:'English',runtime:115,rating:'PG',format:['Standard','KIDS','4DX'],poster:'poster-cat.jpg',coming:false,story:'A magical visitor turns an ordinary day into an extraordinary adventure.',cast:'Family animation'},
 {id:'matloub-3a2eleyain',title:'Matloub 3a2eleyain',arabic:'مطلوب عائلتين',genre:'Comedy',language:'Arabic',runtime:95,rating:'12+',format:['Standard','MAX'],poster:'poster-matloub.jpg',coming:false,story:'Two families, one misunderstanding and a very unforgettable day.',cast:'Egyptian ensemble cast'},
 {id:'midnight-horizon',title:'Midnight Horizon',arabic:'أفق منتصف الليل',genre:'Sci-Fi',language:'English',runtime:124,rating:'12+',format:['MAX','IMAX'],poster:'',coming:true,story:'Across a dark horizon, a new adventure begins.',cast:'Coming soon'},
 {id:'last-light',title:'The Last Light',arabic:'النور الأخير',genre:'Action',language:'English',runtime:108,rating:'PG',format:['Standard','4DX'],poster:'',coming:true,story:'An action adventure at the edge of a new world.',cast:'Coming soon'}
];
export const cinemas=[
 {id:'mall-of-egypt',name:'Mall of Egypt',location:'6th of October · Wahat Road',address:'Mall of Egypt, 6th of October City, Giza, Egypt',formats:['MAX','IMAX','GOLD','4DX','KIDS'],picture:'format-gold.jpg'},
 {id:'city-centre-almaza',name:'City Centre Almaza',location:'Heliopolis · Cairo',address:'City Centre Almaza, Cairo, Egypt',formats:['MAX','GOLD','KIDS'],picture:'format-imax.jpg'},
 {id:'city-centre-alexandria',name:'City Centre Alexandria',location:'Alexandria · Cairo–Alexandria Desert Road',address:'City Centre Alexandria, Alexandria, Egypt',formats:['MAX','Standard','4DX'],picture:'format-max.jpg'}
];
export const formats=[
 {id:'MAX',name:'MAX',tag:'Our biggest screens and loudest sound.',picture:'format-max.jpg',features:['Floor-to-ceiling screen','Laser projection','Dolby Atmos'],cinemas:'3 cinemas'},
 {id:'IMAX',name:'IMAX',tag:'The IMAX screen and sound system.',picture:'format-imax.jpg',features:['IMAX laser','Taller frame on selected films','12-channel sound'],cinemas:'1 cinema'},
 {id:'GOLD',name:'GOLD',tag:'Recliners, a private lounge and food served at your seat.',picture:'format-gold.jpg',features:['Full recliners','Private lounge','In-seat service'],cinemas:'2 cinemas'},
 {id:'4DX',name:'4DX',tag:'Feel every moment of the action.',picture:'format-4dx.jpg',features:['Motion seats','Environmental effects','Immersive action'],cinemas:'2 cinemas'},
 {id:'KIDS',name:'KIDS',tag:'Little screens, big adventures.',picture:'format-kids.jpg',features:['Family seating','Kid-friendly','Comfort'],cinemas:'3 cinemas'},
 {id:'SENSORY',name:'Sensory Friendly',tag:'A calmer experience for everyone.',picture:'format-sensory.jpg',features:['Gentler sound','Soft lighting','Inclusive screenings'],cinemas:'3 cinemas'}
];
export const offers=[
 {id:'ladies',name:'Ladies Morning',label:'FOX OFFER',description:'Lower ticket prices for women on morning shows.',picture:'offer-ladies.jpg',details:'Selected morning shows at participating cinemas. Subject to availability.'},
 {id:'bank',name:'Buy 1, get 1 free',label:'BANK OFFER',description:'Pay with a participating bank card and get your second ticket free.',picture:'offer-bank.jpg',details:'Available with participating cards and eligible sessions. Terms apply.'}
];
export const foods=[
 {id:'popcorn-large',name:'Large Popcorn',category:'Popcorn',price:100,emoji:'🍿'},
 {id:'popcorn-caramel',name:'Caramel Popcorn',category:'Popcorn',price:120,emoji:'🍿'},
 {id:'popcorn-combo',name:'Popcorn Combo',category:'Combos',price:180,emoji:'🥤'},
 {id:'nachos',name:'Nachos & Cheese',category:'Hot food',price:130,emoji:'🧀'},
 {id:'hotdog',name:'Classic Hot Dog',category:'Hot food',price:105,emoji:'🌭'},
 {id:'cola',name:'Soft Drink',category:'Drinks',price:65,emoji:'🥤'},
 {id:'water',name:'Still Water',category:'Drinks',price:30,emoji:'💧'},
 {id:'chocolate',name:'Chocolate Bar',category:'Snacks',price:65,emoji:'🍫'}
];
export const ROWS='ABCDEFGHIJKLM';
const groupsFor=(row)=> row<3?[5,18,6]:row===3?[5,11,8]:row===12?[6,14,7]:[4,11,6];
export const layout=[];
for(let r=0;r<ROWS.length;r++){
 const groups=groupsFor(r), premium=r>=4; let n=0;
 const widths=groups.map((size,i)=>i===0?[-13.2,-9.35]:i===1?[-6.4,6.5]:[9.2,13.3]);
 for(let g=0;g<3;g++)for(let c=0;c<groups[g];c++){
  n++;const [lo,hi]=widths[g];const x=lo+(groups[g]===1?0:c*(hi-lo)/(groups[g]-1));
  const seat={id:ROWS[r]+n,row:ROWS[r],rowIndex:r,number:n,group:g,x:+x.toFixed(3),y:+(r*0.31).toFixed(3),z:+(5+r*2.15).toFixed(3),type:premium?'Premium':'Regular',price:premium?300:180};
  layout.push(seat);
 }
}
export const featuredSeats=['C16','D1','D9','D24','G2','G9','G10','M6','M27'];
export const knownMetrics={
 G2:{distance:'20.7',angle:52,offset:'11.4 m left of centre',tag:'SWEET SPOT'},
 D1:{distance:'14.5',angle:70,offset:'8.5 m left of centre',tag:'SWEET SPOT'},
 G9:{distance:'18.5',angle:57,offset:'0.8 m left of centre',tag:'SWEET SPOT'},
 D9:{distance:'12.6',angle:78,offset:'1.1 m left of centre',tag:'UP CLOSE'},
 M27:{distance:'29.5',angle:37,offset:'12.2 m right of centre',tag:'FULL PICTURE'}
};
export const defaultTaken = layout.filter(s=>(s.number*11+s.rowIndex*17)%37===8 || (s.number*7+s.rowIndex*13)%63===4).map(s=>s.id).filter(s=>!featuredSeats.includes(s));
export const money=n=>new Intl.NumberFormat('en-EG',{maximumFractionDigits:2,minimumFractionDigits:Number.isInteger(n)?0:2}).format(n)+' EGP';
export const getMovie=id=>movies.find(x=>x.id===id)||movies[1];
export const getSeat=id=>layout.find(x=>x.id===id);
export const getShowing=(id,cinema='city-centre-alexandria',date=new Date().toISOString().slice(0,10),time='21:45')=>({id:`${id}:${cinema}:${date}:${time}`,movieId:id,cinemaId:cinema,date,time,format:'Standard'});
