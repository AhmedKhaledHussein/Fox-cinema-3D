import {movies,cinemas,formats,offers,foods,layout,ROWS,featuredSeats,knownMetrics,defaultTaken,money,getMovie,getSeat} from './catalog.js';
import {Theater3D as LegacyTheater3D} from './hall3d.js';
import {mergeCatalogue,inMode,uniqueMoviesForMode} from './catalog-live.js';
import {localizeUI,uiText,genreArabic} from './i18n.js';
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={catalogueUpdated:null,catalogueCount:0,trailerLoading:false,trailerError:'',lang:(typeof localStorage!=='undefined'&&localStorage.getItem('fox-language')==='ar'?'ar':'en'),hero:1,filmMode:'now',query:'',genre:'',format:'',language:'',movieId:'godzilla-minus-zero',cinemaId:'city-centre-alexandria',dateOffset:2,time:'21:45',screenFormat:'Standard',theaterMuted:true,hudOpen:false,selected:new Set(),taken:new Set(defaultTaken),zoom:1,viewer:'G9',holdId:null,expiresAt:null,bookingId:null,ticket:null,step:1,checkoutContact:{email:'',firstName:'',lastName:'',phone:'',marketing:false},foodCinema:'mall-of-egypt',foodCategory:'All',cart:{},account:null,navOpen:false,authMode:'login',searchOpen:false,authOpen:false,trailerOpen:false};
const tr={
 en:{movies:'Movies',cinemas:'Cinemas',ways:'Ways to Watch',offers:'Offers',food:'Food & Drinks',signin:'Sign in',home:'Home',showing:'Now showing',coming:'Coming soon',watch:'Ways to watch',our:'Our cinemas',order:'Order your snacks',ahead:'ahead',seeall:'See all',book:'Book tickets',trailer:'Trailer',search:'Search movies, cast, genres…',screen:'SCREEN',continue:'Continue',view3d:'View in 3D',back:'Back',standard:'Standard',regular:'Regular',premium:'Premium',taken:'Taken',selected:'Selected',summary:'Summary',details:'Details',payment:'Payment',formEmail:'Email address',firstName:'First name',surname:'Surname',mobile:'Mobile number',ready:'Ready to book?',total:'Total',change:'Change seats'},
 ar:{movies:'الأفلام',cinemas:'السينمات',ways:'طرق المشاهدة',offers:'العروض',food:'المأكولات والمشروبات',signin:'دخول',home:'الرئيسية',showing:'يعرض الآن',coming:'قريبًا',watch:'طرق المشاهدة',our:'سينماتنا',order:'اطلب الوجبات',ahead:'مسبقًا',seeall:'عرض الكل',book:'احجز تذاكر',trailer:'إعلان الفيلم',search:'ابحث عن فيلم أو ممثل أو تصنيف…',screen:'الشاشة',continue:'متابعة',view3d:'شاهد بتقنية 3D',back:'عودة',standard:'عادي',regular:'عادي',premium:'مميز',taken:'محجوز',selected:'مختار',summary:'الملخص',details:'البيانات',payment:'الدفع',formEmail:'البريد الإلكتروني',firstName:'الاسم الأول',surname:'اسم العائلة',mobile:'رقم الموبايل',ready:'جاهز للحجز؟',total:'الإجمالي',change:'تغيير المقاعد'}};
const t=k=>tr[state.lang][k]||k;
const site=()=>document.getElementById('app');
const router=()=>decodeURIComponent(location.hash.replace(/^#\/?/,'')).replace(/^\//,'')||'home';
const formatDate=(off,opts={weekday:'short',day:'numeric',month:'short'})=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+off);return d.toLocaleDateString(state.lang==='ar'?'ar-EG':'en-US',opts)};
const isoDate=off=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+off);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const showId=()=>`${state.movieId}:${state.cinemaId}:${isoDate(state.dateOffset)}:${state.time}:${state.screenFormat}`;
const currFilm=()=>getMovie(state.movieId);
// Unverified concept-art only title explicitly withdrawn from all public listings.
const isPublishedFilm=m=>m?.id!=='hadoota';
const featuredMovies=()=>movies.filter(m=>isPublishedFilm(m)&&!m.isLive).slice(0,5);
const currCinema=()=>cinemas.find(c=>c.id===state.cinemaId)||cinemas[2];
const total=()=>[...state.selected].reduce((s,id)=>s+getSeat(id).price,0);
const fee=()=>state.selected.size*15;
const vat=()=>Math.round((total()+fee())*14)/100;
const fullTotal=()=>total()+fee()+vat();
const routeTo=r=>{const h='#/'+r;if(location.hash===h){render();window.scrollTo(0,0)}else location.hash=h};
let renderer=null,toastTimeout,ticker=null,heroClock=null;
function advanceHero(delta=1){
 if(router()!=='home')return;
 state.hero=(state.hero+delta+featuredMovies().length)%featuredMovies().length;
 const node=document.querySelector('.hero');
 if(node&&document.createElement){const holder=document.createElement('div');holder.innerHTML=hero();node.replaceWith(holder.firstElementChild);hydrateFilmPosters(document.querySelector('.hero'));installCinematicMotion();}
 else render();
}
function startHeroClock(){
 if(heroClock)clearInterval(heroClock);
 if(typeof document.visibilityState!=='string'||reducedMotion())return;
 heroClock=setInterval(()=>{if(document.visibilityState==='visible'&&!state.searchOpen&&!state.trailerOpen&&!state.authOpen)advanceHero(1)},6400);
 if(heroClock?.unref)heroClock.unref();
}

function toast(text){const box=$('#toast');if(!box)return;box.textContent=text;box.classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>box.classList.remove('visible'),3500)}
// A static-host fallback keeps navigation and the booking DEMO usable without a Node API.
// It is localStorage-only and intentionally does NOT promise cross-user inventory locks.
const localDemo={holds:{},bookings:{}};
function staticDemoApi(url,method='GET',data={}){
 const clean=url.split('?')[0];
 if(clean==='/api/me')return {account:null};
 if(clean==='/api/health')return {ok:true,mode:'static-browser-demo'};
 if(clean==='/api/seats')return {taken:[...defaultTaken],hold:null};
 if(clean==='/api/holds'&&method==='POST'){
  const id='LOCAL-'+Math.random().toString(36).slice(2,13).toUpperCase();
  localDemo.holds[id]={...data,expiresAt:Date.now()+600000};
  return {holdId:id,expiresAt:localDemo.holds[id].expiresAt,seats:data.seats};
 }
 if(clean==='/api/holds/release')return {released:true};
 if(clean==='/api/bookings'&&method==='POST'){
  const h=localDemo.holds[data.holdId];if(!h||h.expiresAt<Date.now())throw Error('The demonstration hold has expired.');
  const id='FOX-STATIC-'+Math.random().toString(36).slice(2,8).toUpperCase();
  localDemo.bookings[id]={...data,showId:h.showId,seats:h.seats};return {bookingId:id,status:'awaiting_demo_payment'};
 }
 if(clean==='/api/pay-demo'&&method==='POST'){
  if(!localDemo.bookings[data.bookingId])throw Error('Demo booking not found.');
  return {bookingId:data.bookingId,status:'confirmed',ticketCode:'DEMO-'+Math.random().toString(36).slice(2,10).toUpperCase()};
 }
 if(clean.startsWith('/api/register')||clean.startsWith('/api/login'))throw Error('Account registration requires running the included Node server.');
 if(clean==='/api/logout')return {ok:true};
 throw Error('This feature requires the included Node server.');
}
async function api(url,method='GET',data){
 const opts={method,headers:{'Content-Type':'application/json'}};if(data)opts.body=JSON.stringify(data);
 try{
  const response=await fetch(url,opts);const content=response.headers.get('content-type')||'';
  if(!content.includes('application/json'))return staticDemoApi(url,method,data);
  const obj=await response.json();if(!response.ok)throw Error(obj.error||`HTTP ${response.status}`);return obj;
 }catch(e){if(e instanceof TypeError)return staticDemoApi(url,method,data);throw e;}
}
const asset=name=>!name?'/assets/poster-fallback.svg':/^(https?:)?\/\//.test(name)?name:'/assets/'+name;
// The initial image is a unique LOCAL film-specific artwork. A promotional poster
// only replaces it AFTER a successful load. Direct+proxy retries avoid empty cards.
// TMDb posters are actual promotional artwork. If no poster is published, present a
// title-specific clearly labeled fallback rather than a broken image or false film poster.
const posterFallback=m=>{
 const label=String(m?.title||'FOX CINEMA').slice(0,62);
 const lines=label.match(/.{1,18}(?:\s|$)/g)?.slice(0,4)||[label];
 const escaped=value=>String(value).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[x]));
 const hash=[...String(m?.id||label)].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
 const hue=280+hash%65;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs><linearGradient id="b" x2=".8" y2="1"><stop stop-color="hsl(${hue} 38% 18%)"/><stop offset="1" stop-color="#0d0d15"/></linearGradient></defs><rect width="600" height="900" fill="url(#b)"/><circle cx="400" cy="295" r="210" fill="none" stroke="#ffffff20" stroke-width="3"/><path d="M70 540L530 110M90 150L510 650" fill="none" stroke="#ffffff12" stroke-width="16"/><text x="45" y="580" font-size="48" fill="#fff" font-weight="700" font-family="Arial,sans-serif">${lines.map((v,i)=>`<tspan x="45" dy="${i?64:0}">${escaped(v.trim())}</tspan>`).join('')}</text><text x="45" y="822" font-size="18" letter-spacing="3" fill="#d3a7cb" font-family="Arial,sans-serif">OFFICIAL POSTER UNAVAILABLE</text><text x="45" y="860" font-size="19" fill="#fff9" font-family="Arial,sans-serif">FOX CINEMA · TMDb discovery</text></svg>`;
 return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
const localFilmArt=m=>m.isLive?(m.posterUrl||posterFallback(m)):`/assets/posters/${encodeURIComponent(m.id)}.webp`;
const movieArtwork=m=>localFilmArt(m);
const movieName=m=>state.lang==='ar'?m.arabic:m.title;
const movieStory=m=>state.lang==='ar'?(m.storyArabic||m.story):m.story;
const labelGenre=g=>state.lang==='ar'?(genreArabic[g]||g):g;
const movieDuration=m=>m.runtime?(state.lang==='ar'?`${Math.floor(m.runtime/60)} س ${String(m.runtime%60).padStart(2,'0')} د`:`${Math.floor(m.runtime/60)}h ${String(m.runtime%60).padStart(2,'0')}m`):(state.lang==='ar'?'المدة غير معلنة':'TBA');
const labelLanguage=l=>state.lang==='ar'?({Arabic:'العربية',English:'الإنجليزية',Japanese:'اليابانية'}[l]||l):l;
const moviePoster=(m,cls='')=>`<img class="${cls}" src="${esc(localFilmArt(m))}" data-film-poster="${esc(m.id)}" data-poster-fallback="${esc(posterFallback(m))}" alt="${esc(movieName(m))}" loading="${cls==='hero-poster'?'eager':'lazy'}" decoding="async"/>`;
// Broken image URLs (including third-party refusals) fall back to each film's own artwork.
document.addEventListener('error',event=>{
 const el=event.target;if(!el?.matches?.('[data-film-poster]')||el.dataset.posterFailed)return;
 el.dataset.posterFailed='1';el.src=el.dataset.posterFallback;
},true);
const curatedLookup=new Map();
async function resolveCuratedArtwork(movie){
 if(movie.isLive)return null;
 // The live catalogue already supplied a verified TMDb promotional poster.
 // Avoid another search API call for every card that scrolls into view.
 if(/^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\//.test(movie.posterUrl||''))return {posterUrl:movie.posterUrl,tmdbId:movie.tmdbId};
 if(!curatedLookup.has(movie.id))curatedLookup.set(movie.id,(async()=>{
  try{
   const res=await fetch('/api/title?id='+encodeURIComponent(movie.id),{cache:'default'});
   if(!res.ok)return null;
   const result=await res.json();
   if(/^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\//.test(result.posterUrl||'')){
    movie.posterUrl=result.posterUrl;movie.tmdbId=result.tmdbId;movie.posterSource=result.source;return result;
   }
  }catch(err){console.debug('Official poster lookup unavailable:',err.message)}
  return null;
 })());
 return curatedLookup.get(movie.id);
}
const posterAttempts=source=>source&&/^https:\/\//i.test(source)?[source,`https://wsrv.nl/?url=${encodeURIComponent(source)}&w=960&fit=inside&output=webp`,`https://images.weserv.nl/?url=${encodeURIComponent(source.replace(/^https?:\/\//,''))}&w=960`]:[];
let posterObserver=null;
const filmPosterLoading=new WeakSet();
async function loadOfficialFilmPoster(el){
 if(!el?.isConnected||filmPosterLoading.has(el))return;
 filmPosterLoading.add(el);
 const movie=movies.find(m=>m.id===el.dataset.filmPoster);if(!movie)return;
 if(!movie.isLive)await resolveCuratedArtwork(movie);
 if(!el.isConnected||!movie.posterUrl)return;
 const candidates=posterAttempts(movie.posterUrl);let attempt=0;
 const next=()=>{
  if(!el.isConnected||attempt>=candidates.length)return;
  const image=new Image();image.decoding='async';const src=candidates[attempt++];
  image.onload=()=>{if(!el.isConnected||image.naturalWidth<140||image.naturalHeight<180){next();return;}
   el.onerror=()=>{el.onerror=null;el.src=el.dataset.posterFallback||posterFallback(movie);};
   el.src=src;el.classList.add('poster-official');
   if(el.classList.contains('hero-poster')){const backdrop=document.querySelector('.hero-bg');if(backdrop)backdrop.style.backgroundImage=`url("${src.replaceAll('"','%22')}")`;}
  };
  image.onerror=next;image.src=src;
 };
 next();
}
function hydrateFilmPosters(root=document,reset=false){
 if(reset){posterObserver?.disconnect();posterObserver=null;}
 if(!root||typeof root.querySelectorAll!=='function')return;
 const imgs=[...root.querySelectorAll('[data-film-poster]')];
 if(!('IntersectionObserver' in window)){imgs.forEach(loadOfficialFilmPoster);return;}
 if(!posterObserver)posterObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){loadOfficialFilmPoster(entry.target);posterObserver?.unobserve(entry.target);}}, {rootMargin:'380px 0px'});
 imgs.forEach(el=>posterObserver.observe(el));
}

const img=(src,cls='',alt='')=>`<img loading="lazy" src="${asset(src)}" alt="${esc(alt)}" class="${cls}" onerror="this.onerror=null;this.src='/assets/poster-fallback.svg'"/>`;
const activeNav=r=>router()===r?'active':'';
const logo=()=>`<a class="logo" href="#/home" aria-label="FOX Cinema home">FOX <small>CINEMA</small></a>`;
const nav=()=>`<header class="site-header"><div class="container header-inner">${logo()}<nav class="nav-links ${state.navOpen?'open':''}" aria-label="Main navigation">${[['movies','movies'],['cinemas','cinemas'],['formats','ways'],['offers','offers'],['food','food']].map(([r,label])=>`<a class="${activeNav(r)}" href="#/${r}" data-action="close-nav">${t(label)}</a>`).join('')}</nav><div class="nav-actions"><button class="nav-icon" data-action="search-open" title="Search" aria-label="Search">⌕</button><button class="pill header-lang" data-action="lang" aria-label="Switch language">${state.lang==='en'?'عربي':'EN'}</button><button class="btn btn-white header-signin" data-action="auth-open">${state.account?esc(state.account.name.split(' ')[0]):t('signin')}</button><button class="icon-btn menu-btn" data-action="menu" aria-label="Open menu">☰</button></div></div></header>`;
const footer=()=>`<footer class="site-footer"><div class="container"><div class="footer-grid"><div>${logo()}<p class="muted" style="max-width:280px;margin-top:25px">Movies are better together. Find your next big-screen moment with FOX CINEMA.</p><form id="newsletter" class="newsletter"><input type="email" placeholder="Email for updates" aria-label="Email for updates" required/><button aria-label="Subscribe">→</button></form></div><div class="footer-links"><h4>Explore</h4><a href="#/movies">Movies</a><a href="#/cinemas">Cinemas</a><a href="#/formats">Ways to Watch</a></div><div class="footer-links"><h4>More from FOX</h4><a href="#/offers">Offers</a><a href="#/food">Food & Drinks</a><a href="#/movies">Showtimes</a></div><div class="footer-links"><h4>Support</h4><a href="#/cinemas">Find a cinema</a><a href="#/offers">Terms & offers</a><a href="#/home">About FOX</a></div></div><div class="footer-bottom"><span>© 2026 FOX CINEMA · Curated demonstration</span><span>Artwork credits per film · No real tickets or payments</span></div></div></footer>`;
const movieCard=m=>`<article class="movie-card" data-action="open-movie" data-id="${m.id}" tabindex="0" role="link"><div class="poster-wrap">${moviePoster(m)}<span class="age-label">${m.isLive?'TMDb':m.rating}</span></div><div class="movie-title">${esc(state.lang==='ar'?m.arabic:m.title)}</div><div class="movie-sub">${labelGenre(m.genre)} · ${movieDuration(m)} · ${labelLanguage(m.language)}</div></article>`;
const sectionHeader=(label,start,italic,desc='',link='')=>`<div class="section-head"><div><div class="label">${label}</div><h2>${start} <em>${italic}</em></h2>${desc?`<p class="section-desc">${desc}</p>`:''}</div>${link?`<a href="#/${link}" class="small">${t('seeall')} &nbsp; →</a>`:''}</div>`;
const quickbook=()=>`<div class="quick-book"><label class="quick-field"><span>CINEMA</span><select id="quickCinema"> <option value="all">All cinemas</option>${cinemas.map(c=>`<option value="${c.id}">${state.lang==='ar'?(c.nameAr||c.name):c.name}</option>`).join('')}</select></label><label class="quick-field"><span>MOVIE</span><select id="quickMovie"><option value="all">Any movie</option>${movies.filter(m=>isPublishedFilm(m)&&!m.coming&&!m.isLive).map(m=>`<option value="${m.id}">${movieName(m)}</option>`).join('')}</select></label><label class="quick-field"><span>DATE</span><select id="quickDate">${Array.from({length:7},(_,i)=>`<option value="${i}">${i===0?'Today':formatDate(i)}</option>`).join('')}</select></label><label class="quick-field"><span>SHOWTIMES</span><select id="quickFormat"><option>All formats</option>${formats.slice(0,5).map(f=>`<option>${f.name}</option>`).join('')}</select></label><button class="btn btn-pink" data-action="quick-book">Show times&nbsp; →</button></div>`;
function hero(){const candidates=featuredMovies();const m=candidates[state.hero%candidates.length];return `<section class="hero"><div class="hero-bg" style="background-image:url('${movieArtwork(m)}')"></div><div class="container"><div class="hero-display"><div class="hero-copy"><div class="label">NOW SHOWING · MAX · 4DX</div><h1 class="hero-title">${esc(state.lang==='ar'?m.arabic:m.title)}</h1><div class="meta"><span class="age">${m.rating}</span> · ${labelGenre(m.genre)} · ${movieDuration(m)} · ${labelLanguage(m.language)}</div><p class="hero-description">${esc(movieStory(m))}</p><div class="hero-actions"><button class="btn btn-pink" data-action="book-movie" data-id="${m.id}">⌗ &nbsp;${m.isLive?(state.lang==='ar'?'للاستكشاف فقط':'Discovery only'):(m.coming?t('coming'):t('book'))}</button><button class="btn btn-dark" data-action="trailer-open" data-id="${m.id}">▸ &nbsp; ${t('trailer')}</button></div></div>${moviePoster(m,'hero-poster')}</div><div class="hero-controls"><span class="hero-number small">${String(state.hero%candidates.length+1).padStart(2,'0')} / ${String(candidates.length).padStart(2,'0')}</span><div class="hero-meter">${candidates.map((_,i)=>`<button class="${i===state.hero%candidates.length?'active':''}" data-action="hero-select" data-index="${i}" aria-label="Slide ${i+1}">•</button>`).join('')}</div><div class="hero-arrows"><button class="icon-btn" data-action="hero-prev" aria-label="Previous slide">‹</button><button class="icon-btn" data-action="hero-next" aria-label="Next slide">›</button></div></div>${quickbook()}</div></section>`}
const formatsCards=()=>formats.map(f=>`<a class="format-card" href="#/format/${f.id}" aria-label="${f.name}"><img loading="lazy" src="${asset(f.picture)}" alt="${esc(f.name)} theatre"/><span class="top-left">◈</span><span class="top-right tag">⌖ ${f.cinemas}</span><div class="content"><h3>${f.name}</h3><p>${state.lang==='ar'?(f.tagAr||f.tag):f.tag}</p><div class="tags">${(state.lang==='ar'?(f.featuresAr||f.features):f.features).map(x=>`<span>${x}</span>`).join('')}</div></div></a>`).join('');
const cinemaCards=()=>cinemas.map(c=>`<a class="cinema-card" href="#/cinema/${c.id}">${img(c.picture,'',c.name)}<div class="content"><h3>${state.lang==='ar'?(c.nameAr||c.name):c.name}</h3><p>${state.lang==='ar'?(c.locationAr||c.location):c.location} &nbsp; →</p><div class="tags" style="margin-top:11px">${c.formats.slice(0,3).map(f=>`<span>${f}</span>`).join('')}</div></div></a>`).join('');
const offerCards=()=>offers.map(o=>`<a class="offer-card" href="#/offer/${o.id}">${img(o.picture,'',o.name)}<div class="content"><div class="label">${o.label}</div><h3>${state.lang==='ar'?(o.nameAr||o.name):o.name}</h3><p>${state.lang==='ar'?(o.descriptionAr||o.description):o.description}</p><span class="more">More →</span></div></a>`).join('');
function home(){return `${nav()}<main id="main-content">${hero()}<section class="section container" id="movies">${sectionHeader('MOVIES',state.lang==='en'?'Now':'يعرض',state.lang==='en'?'showing':'الآن','','movies')}<div class="movie-grid">${featuredMovies().map(movieCard).join('')}</div></section><section class="section container">${sectionHeader('WAYS TO WATCH',state.lang==='en'?'Ways to':'طرق',state.lang==='en'?'watch':'المشاهدة',"There's more than one way to watch a movie at FOX.",'formats')}<div class="formats-grid">${formatsCards()}</div></section><section class="section container">${sectionHeader('FOX CINEMA','Take a','look','A closer look at your cinema experience.')}<div class="gallery-grid">${['format-gold-original.webp','cinema-lobby-original.webp','format-imax-original.webp'].map((p,i)=>img(p,'g-img',['Golden recliners','MAX theatre','IMAX cinema'][i])).join('')}</div></section><section class="section container"><div class="food-banner"><div class="copy"><div class="label">FOOD & DRINKS</div><h2>Order your snacks <em>ahead</em></h2><p class="muted">Choose your cinema, order online, and pick it up at the counter when you arrive.</p><p class="muted small">♧ Popcorn &nbsp;&nbsp; ♜ Hot food &nbsp;&nbsp; ◇ Drinks</p><a href="#/food" class="btn btn-white">Order food & drinks &nbsp; →</a></div><div class="food-art original-food-art"><img src="/assets/food-lounge-original.webp" alt="Original cinema snacks artwork"/></div></div></section><section class="section container">${sectionHeader('OFFERS','', 'Offers','Ticket deals and bank offers running now.','offers')}<div class="offer-grid">${offerCards()}</div></section><section class="section container">${sectionHeader('LOCATIONS','Our', 'cinemas','Find your nearest FOX CINEMA.','cinemas')}<div class="cinema-grid">${cinemaCards()}</div></section></main>${footer()}`}
function moviesPage(){let filtered=uniqueMoviesForMode(movies,state.filmMode).filter(isPublishedFilm);if(state.query)filtered=filtered.filter(m=>`${m.title} ${m.arabic} ${labelGenre(m.genre)} ${m.cast}`.toLowerCase().includes(state.query.toLowerCase()));if(state.genre)filtered=filtered.filter(m=>m.genre===state.genre);if(state.format)filtered=filtered.filter(m=>m.format.includes(state.format));if(state.language)filtered=filtered.filter(m=>m.language===state.language);const genres=[...new Set(movies.map(m=>m.genre))];return `${nav()}<main id="main-content" class="inner-page container movies-page"><div class="label">MOVIES</div><h1 class="page-heading">${state.lang==='ar'?(({now:'يعرض <em>الآن</em>',coming:'قريبًا <em>في السينما</em>',explore:'اكتشف <em>الأفلام</em>',series:'أحدث <em>المسلسلات</em>',arabic:'أعمال <em>عربية</em>'}[state.filmMode]||'اكتشف <em>الأفلام</em>')):(({now:'Now <em>showing</em>',coming:'Coming <em>soon</em>',explore:'Discover <em>movies</em>',series:'TV <em>series</em>',arabic:'Arabic <em>titles</em>'}[state.filmMode]||'Discover <em>movies</em>'))}</h1><div class="filters-wide"><div class="seg"><button class="${state.filmMode==='now'?'on':''}" data-action="film-mode" data-value="now">${t('showing')}</button><button class="${state.filmMode==='coming'?'on':''}" data-action="film-mode" data-value="coming">${t('coming')}</button><button class="${state.filmMode==='explore'?'on':''}" data-action="film-mode" data-value="explore">${state.lang==='ar'?'اكتشف الأفلام':'Discover films'}</button><button class="${state.filmMode==='series'?'on':''}" data-action="film-mode" data-value="series">${state.lang==='ar'?'المسلسلات':'TV series'}</button><button class="${state.filmMode==='arabic'?'on':''}" data-action="film-mode" data-value="arabic">${state.lang==='ar'?'أعمال عربية':'Arabic titles'}</button></div><div class="filter-bar"><input class="filter-search" id="filmQuery" aria-label="Search movies" placeholder="⌕ Search by title, actor or genre" value="${esc(state.query)}"/><select id="filmGenre" class="filter-select"><option value="">All genres</option>${genres.map(g=>`<option ${state.genre===g?'selected':''}>${g}</option>`).join('')}</select><select id="filmFormat" class="filter-select"><option value="">All formats</option>${formats.map(f=>`<option ${state.format===f.name?'selected':''}>${f.name}</option>`).join('')}</select><select id="filmLanguage" class="filter-select"><option value="">All languages</option>${[...new Set(movies.map(m=>m.language))].map(g=>`<option ${state.language===g?'selected':''}>${g}</option>`).join('')}</select></div></div><p class="tmdb-data-note">${state.catalogueUpdated?`${state.lang==='ar'?'كتالوج TMDb:':'TMDb catalogue:'} ${state.catalogueCount} ${state.lang==='ar'?'عنوان؛ آخر تحديث:':'titles; synced'} ${new Date(state.catalogueUpdated).toLocaleString(state.lang==='ar'?'ar-EG':'en-US')}`:(state.lang==='ar'?'قائمة تجريبية؛ فعّل واجهة TMDb الآمنة على Vercel لعرض البيانات الحية.':'Demo catalogue — connect the secure Vercel TMDb API to load live discoveries.')}. ${state.lang==='ar'?'بيانات استكشاف وليست مواعيد عرض أو حجوزات فعلية.':'Discovery listings are not cinema showtimes or tickets.'} <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">TMDb</a></p><div id="filmResults" class="movie-grid">${filtered.length?filtered.map(movieCard).join(''):'<div class="empty-state">No matching movies. Try adjusting your filters.</div>'}</div></main>${footer()}`}
function cinemasPage(){return `${nav()}<main class="inner-page container" id="main-content"><div class="label">CINEMAS</div><h1 class="page-heading">Our <em>cinemas</em></h1><p class="section-desc">Discover the big screen experience at our destinations.</p><div class="cinema-grid" style="margin-top:40px">${cinemaCards()}</div></main>${footer()}`}
function cinemaPage(id){const c=cinemas.find(c=>c.id===id)||cinemas[0];return `${nav()}<main id="main-content" class="inner-page container"><div class="label">FOX CINEMA · EGYPT</div><h1 class="page-heading">${state.lang==='ar'?(c.nameAr||c.name):c.name}</h1><p class="muted">⌖ ${state.lang==='ar'?(c.locationAr||c.location):c.location}</p><div class="page-art" style="height:410px;margin:35px 0">${img(c.picture,'',c.name)}</div><h2>Experience more</h2><div class="tags">${c.formats.map(f=>`<span>${f}</span>`).join('')}</div><div class="section-head" style="margin-top:40px"><div><h2 style="font-size:45px">Now <em>showing</em></h2></div></div><div class="movie-grid">${movies.filter(x=>!x.coming).map(movieCard).join('')}</div></main>${footer()}`}
function formatsPage(){return `${nav()}<main id="main-content" class="inner-page container"><div class="label">WAYS TO WATCH</div><h1 class="page-heading">Ways to <em>watch</em></h1><p class="section-desc">There's more than one way to watch a movie at FOX.</p><div class="formats-grid" style="margin-top:40px">${formatsCards()}</div></main>${footer()}`}
function formatPage(id){const f=formats.find(f=>f.id===id)||formats[0];return `${nav()}<main class="inner-page container" id="main-content"><div class="format-banner" style="--format-image:url('${asset(f.picture)}')"><div><div class="label">FOX CINEMA EXPERIENCE</div><h1>${f.name}</h1><p>${state.lang==='ar'?(f.tagAr||f.tag):f.tag}</p><a href="#/movies" class="btn btn-pink">Explore movies →</a></div></div><div class="section" style="padding-top:50px"><div class="label">THE EXPERIENCE</div><h2>Beyond the <em>ordinary</em></h2><div class="benefits">${(state.lang==='ar'?(f.featuresAr||f.features):f.features).map(s=>`<span>✓ &nbsp; ${s}</span>`).join('')}</div><h3>Showing in ${f.cinemas}</h3><div class="movie-grid">${movies.filter(m=>!m.coming&&m.format.includes(f.id)).map(movieCard).join('')}</div></div></main>${footer()}`}
function offersPage(){return `${nav()}<main id="main-content" class="inner-page container"><div class="label">SPECIAL DEALS</div><h1 class="page-heading"><em>Offers</em></h1><p class="section-desc">Ticket deals and bank offers running now.</p><div class="offer-grid" style="margin-top:45px">${offerCards()}</div></main>${footer()}`}
function offerPage(id){const o=offers.find(o=>o.id===id)||offers[0];return `${nav()}<main id="main-content" class="inner-page container"><div class="label">${o.label}</div><h1 class="page-heading">${state.lang==='ar'?(o.nameAr||o.name):o.name}</h1><div class="page-art" style="height:390px">${img(o.picture,'',o.name)}</div><h2 style="margin-top:34px">${state.lang==='ar'?(o.descriptionAr||o.description):o.description}</h2><p class="muted">${state.lang==='ar'?(o.detailsAr||o.details):o.details}</p><a href="#/movies" class="btn btn-pink">Browse movies →</a></main>${footer()}`}
function foodPage(){const categories=['All','Popcorn','Combos','Hot food','Drinks','Snacks'];const filtered=foods.filter(f=>state.foodCategory==='All'||f.category===state.foodCategory);const count=Object.values(state.cart).reduce((a,b)=>a+b,0);const price=foods.reduce((a,b)=>a+b.price*(state.cart[b.id]||0),0);return `${nav()}<main id="main-content" class="inner-page container"><div class="label">FOOD & DRINKS</div><h1 class="page-heading">Pick your <em>favourites</em></h1><div class="food-top"><p class="section-desc">The perfect movie starts with the perfect snacks.</p><label class="muted">Pick-up cinema: <select class="filter-select" id="foodCinema">${cinemas.map(c=>`<option value="${c.id}" ${state.foodCinema===c.id?'selected':''}>${state.lang==='ar'?(c.nameAr||c.name):c.name}</option>`).join('')}</select></label></div><div class="food-tabs">${categories.map(c=>`<button class="pill ${state.foodCategory===c?'active':''}" data-action="food-filter" data-id="${c}">${c}</button>`).join('')}</div><div class="food-grid">${filtered.map(f=>`<article class="food-card"><div class="food-emoji" aria-hidden="true">${f.emoji}</div><h3>${state.lang==='ar'?(f.nameAr||f.name):f.name}</h3><p class="muted small">${uiText(f.category,state.lang)}</p><div class="food-bottom"><strong>${money(f.price)}</strong><div class="count-controls"><button data-action="food-minus" data-id="${f.id}" aria-label="Remove ${f.name}">−</button><b>${state.cart[f.id]||0}</b><button data-action="food-plus" data-id="${f.id}" aria-label="Add ${f.name}">+</button></div></div></article>`).join('')}</div></main>${count?`<div class="cart-bar"><span>${count} items · <b>${money(price)}</b></span><button class="btn btn-white" data-action="food-order">Place demo order →</button></div>`:''}${footer()}`}
function datesRow(){return Array.from({length:7},(_,i)=>`<button class="day ${i===state.dateOffset?'on':''}" data-action="select-date" data-offset="${i}"><span>${i===0?'TODAY':formatDate(i,{weekday:'short'}).toUpperCase()}</span><strong>${formatDate(i,{day:'numeric'})}</strong></button>`).join('')}
const tabCinema=()=>`<div class="cinema-tabs"><button class="pill ${state.cinemaId==='all'?'active':''}" data-action="detail-cinema" data-id="all">All cinemas</button>${cinemas.map(c=>`<button class="pill ${c.id===state.cinemaId?'active':''}" data-action="detail-cinema" data-id="${c.id}">${state.lang==='ar'?(c.nameAr||c.name):c.name}</button>`).join('')}</div>`;
const showGroup=c=>`<div class="show-cinema"><div><h3>${state.lang==='ar'?(c.nameAr||c.name):c.name}</h3><div class="muted small">${state.lang==='ar'?(c.locationAr||c.location):c.location}</div></div><div>${['Standard','MAX','IMAX','GOLD','4DX','KIDS'].filter(f=>f==='Standard'||(currFilm().format.includes(f)&&c.formats.includes(f))).map(f=>`<div class="show-row"><span class="show-format">${f}</span><div class="show-times">${(f==='Standard'?['12:00','15:00','18:30','21:45']:['11:00','14:30','17:45']).map(time=>`<button data-action="choose-show" data-movie="${state.movieId}" data-cinema="${c.id}" data-time="${time}" data-format="${f}">${time}<small style="display:block;font-size:9px;color:#aaa">${f}</small></button>`).join('')}</div></div>`).join('')}</div></div>`;
function movieDetailPage(id){state.movieId=id;const m=currFilm();return `${nav()}<main id="main-content"><section class="movie-detail-hero"><div class="container"><div class="movie-detail-head">${moviePoster(m,'detail-poster')}<div><div class="label">${m.isLive?'TMDb · DISCOVERY':(m.coming?'COMING SOON':'NOW SHOWING')}</div><div class="poster-source-tag">${state.lang==='ar'?'صورة دعائية عند توفرها · معاينة تجريبية':'Promotional art where available · Demo preview'}</div><h1>${esc(state.lang==='ar'?m.arabic:m.title)}</h1><div class="meta"><span class="age">${m.rating}</span> · ${labelGenre(m.genre)} · ${movieDuration(m)} · ${labelLanguage(m.language)}</div><div class="hero-actions" style="margin-top:27px"><button class="btn btn-pink" data-action="book-movie" data-id="${m.id}">⌗ &nbsp; ${m.isLive?(state.lang==='ar'?'للاستكشاف فقط':'Discovery only'):(m.coming?t('coming'):t('book'))}</button><button class="btn btn-dark" data-action="trailer-open" data-id="${m.id}">▸ &nbsp;${t('trailer')}</button></div></div></div><div class="detail-stats"><div><div class="label" style="letter-spacing:1px">GENRE</div><p>${labelGenre(m.genre)}</p></div><div><div class="label" style="letter-spacing:1px">RUNNING TIME</div><p>${m.runtime?m.runtime+' '+(state.lang==='ar'?'دقيقة':'min'):(state.lang==='ar'?'غير معلنة':'TBA')}</p></div><div><div class="label" style="letter-spacing:1px">RELEASE DATE</div><p>${esc(m.releaseDate||'2026-11-13')}</p></div><div><div class="label" style="letter-spacing:1px">LANGUAGE</div><p>${labelLanguage(m.language)}</p></div></div></div></section><div class="container detail-columns"><div class="story"><div class="label" style="color:#777">STORY</div><p>${esc(movieStory(m))}</p><p class="muted small"><strong style="color:#fff">Starring:</strong> ${esc(m.cast)}</p></div><div class="showtimes" id="showtimes"><div class="label" style="color:#777">${m.isLive?'TMDb · NO LOCAL SHOWTIMES':(m.coming?'COMING SOON':'DEMO SHOWTIMES · NOT REAL TICKETS')}</div><div class="days">${datesRow()}</div>${(m.coming||m.isLive)?'<p class="muted">No confirmed FOX showtimes or tickets for this title. Check official cinema listings.</p>':tabCinema()+(state.cinemaId==='all'?cinemas:cinemas.filter(c=>c.id===state.cinemaId)).map(showGroup).join('')}</div></div></main>${footer()}`}
const rowsGrouped=()=>ROWS.split('').map((row,r)=>{const arr=layout.filter(s=>s.row===row),groups=[0,1,2].map(g=>arr.filter(s=>s.group===g));return `<div class="seat-row ${r===2||r===3?'row-gap':r===6?'row-aisle':''}"><span class="row-letter">${row}</span>${groups.map((g,i)=>`${i>0?'<span class="aisle"></span>':''}<div class="seat-group" style="--seat-count:${g.length}">${g.map(s=>`<button class="seat ${s.type==='Premium'?'premium':''} ${state.taken.has(s.id)?'taken':''} ${state.selected.has(s.id)?'selected':''}" data-action="seat" data-id="${s.id}" aria-label="Seat ${s.id}, ${s.type}, ${state.taken.has(s.id)?'taken':state.selected.has(s.id)?'selected':'available'}" aria-pressed="${state.selected.has(s.id)}" title="${s.id} · ${money(s.price)}" ${state.taken.has(s.id)?'disabled':''}>${state.selected.has(s.id)?s.number:''}</button>`).join('')}</div>`).join('')}</div>`}).join('');
function seatPage(id){state.movieId=id||state.movieId;const film=currFilm();return `<main id="main-content" class="booking-shell"><div class="booking-top"><button class="icon-btn" data-action="back-movie" aria-label="Back to movie">‹</button><div class="title-center"><h1 title="${esc(film.title)}">${esc(film.title)}</h1><p class="booking-meta"><span class="booking-cinema">${esc(currCinema().name)}</span><strong class="show-format-pill">${esc(state.screenFormat)}</strong><time class="booking-day">${formatDate(state.dateOffset,{weekday:'short',day:'numeric',month:'short'})}</time></p></div><button class="icon-btn" data-action="booking-info" title="About seat types">ⓘ</button></div><div class="booking-times" data-count="${state.screenFormat==='Standard'?4:3}" role="group" aria-label="${state.lang==='ar'?'مواعيد العرض':'Showtimes'}">${(state.screenFormat==='Standard'?['12:00','15:00','18:30','21:45']:['11:00','14:30','17:45']).map(time=>`<button type="button" class="${time===state.time?'on':''}" data-action="seat-time" data-time="${time}" aria-pressed="${time===state.time}"><span class="time-value">${time}</span><span class="time-format">${esc(state.screenFormat)}</span></button>`).join('')}</div><div class="booking-screen">${t('screen')}</div><div class="seat-ruler"><button class="icon-btn" data-action="zoom-minus" aria-label="Zoom out">−</button><button class="icon-btn" data-action="zoom-plus" aria-label="Zoom in">+</button></div><div class="seat-map-viewport ${state.zoom>1?'is-zoomed':''}" id="seatViewport"><div class="seat-zoom" style="--mobile-map-width:${Math.round(state.zoom*100)}%;transform:scale(${state.zoom})"><div class="seat-map">${rowsGrouped()}</div></div></div><div class="seat-legend"><span><i class="seat-dot regular"></i>${t('regular')}</span><span><i class="seat-dot taken"></i>${t('taken')}</span><span><i class="seat-dot premium"></i>${t('premium')}</span><span><i class="seat-dot selected"></i>${t('selected')}</span></div><p class="small muted" style="text-align:center;margin-top:22px">Choose up to 9 seats · <button class="pill" style="padding:5px 12px" data-action="sample-seats">Load video reference seats</button></p><div class="booking-bottombar"><div class="booking-actions"><div class="booking-total"><small aria-live="polite">${state.selected.size?(state.selected.size+' '+(state.selected.size===1?'seat':'seats')+' · '+[...state.selected].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).join(', ')):(state.lang==='ar'?'اختار مقعدك':'Select your seats')}</small><strong class="${!state.selected.size?'no-selected':''}">${money(total())}</strong></div><button class="btn btn-outline" data-action="open-3d" ${state.selected.size?'':'disabled'}>⬡ &nbsp; ${t('view3d')}</button><button class="btn btn-green" data-action="start-checkout" ${state.selected.size?'':'disabled'}>${t('continue')}</button></div></div></main>`}
function metricFor(id){const s=getSeat(id)||getSeat('G9');if(knownMetrics[id])return knownMetrics[id];const d=8.5+s.rowIndex*2.1;const o=Math.abs(s.x).toFixed(1);return{distance:d.toFixed(1),angle:Math.round(1200/(d+4)),offset:`${o} m ${s.x<0?'left':'right'} of centre`,tag:s.rowIndex>7?'FULL PICTURE':s.rowIndex<4?'UP CLOSE':'SWEET SPOT'}}
function miniMap(){return `<div class="mini-seatmap" aria-hidden="true">${Array.from({length:112},(_,i)=>`<div class="${i===53?'mid':''}"></div>`).join('')}</div>`}
function hudContent(){const id=state.viewer,s=getSeat(id)||getSeat('G9'),m=metricFor(id);return `<div class="hud-head"><div><div class="hud-status">${m.tag}</div><h2>Row ${s.row}, Seat ${s.number}</h2><div class="hud-sub">${s.type==='Premium'?'Premium recliner':'Regular seat'} · ${money(s.price)}</div></div>${miniMap()}</div><div class="hud-chips">${[...state.selected].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(id=>`<button class="hud-chip ${state.viewer===id?'on':''}" data-action="change-view" data-id="${id}">${id}</button>`).join('')}</div><div class="hud-metrics"><div><strong>${m.distance} m</strong><small>to screen</small></div><div><strong>${m.angle}°</strong><small>field of view</small></div><div><strong>${m.offset.split(' ').slice(0,2).join(' ')}</strong><small>${m.offset.split(' ').slice(2).join(' ')}</small></div></div><button class="btn btn-white" data-action="start-checkout">Book ${state.selected.size} seats · ${money(total())}</button><button class="btn btn-outline" data-action="back-to-seats">${t('change')}</button>`}
function theaterPage(){if(!state.selected.has(state.viewer))state.viewer=[...state.selected][0]||'G9';state.theaterMuted=true;state.hudOpen=false;return `<main id="main-content" class="theater-page"><canvas id="theaterCanvas" aria-label="Interactive 3D movie theater interior"></canvas><div class="theater-vignette"></div><button class="icon-btn theater-back" data-action="back-to-seats" aria-label="Back">‹</button><div class="seat-view-label"><span class="live-dot">●</span> <span id="viewLabel">${esc(state.screenFormat)} · View from ${state.viewer}</span></div><div class="theater-controls"><span>Drag to look around · scroll to zoom</span><button data-action="3d-reset">Reset view ⟲</button><button class="theater-audio-btn" id="theaterSound" data-action="3d-sound" aria-pressed="false" aria-label="Enable trailer sound">🔇 <span>Sound off</span></button></div><button class="hud-scrim" type="button" data-action="hud-toggle" tabindex="-1" aria-label="${state.lang==='ar'?'إغلاق التفاصيل':'Close seat details'}" aria-hidden="true"></button><button class="hud-toggle" type="button" data-action="hud-toggle" aria-controls="theaterHud" aria-expanded="false" aria-label="${state.lang==='ar'?'عرض تفاصيل المقعد':'Show seat details'}"><span class="hud-toggle-chevron" aria-hidden="true">‹</span><span class="hud-toggle-copy">${state.lang==='ar'?'التفاصيل':'Details'}</span></button><aside class="hud" id="theaterHud" role="region" aria-hidden="true" aria-label="${state.lang==='ar'?'تفاصيل المقعد والحجز':'Seat and booking details'}"><button class="hud-dismiss" type="button" data-action="hud-toggle" aria-label="${state.lang==='ar'?'إخفاء تفاصيل المقعد':'Close seat details'}">×</button><div id="hudContent">${hudContent()}</div></aside></main>`}
function checkoutSummary(){const seatList=[...state.selected].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));const premium=seatList.filter(id=>getSeat(id).type==='Premium').length;const regular=seatList.length-premium;return `<div class="checkout-summary"><div><small>MOVIE & CINEMA</small><strong>${currFilm().title}</strong><div class="muted small">${currCinema().name} · ${formatDate(state.dateOffset)}</div></div><div><small>SHOWTIME & SEATS</small><strong>${state.time} · ${seatList.join(', ')}</strong><div class="muted small">${esc(state.screenFormat)} · ${state.selected.size} seats</div></div></div><div class="checkout-bill">${regular?`<div class="row"><span>Regular · ${regular} × 180 EGP</span><strong>${money(regular*180)}</strong></div>`:''}${premium?`<div class="row"><span>Premium recliner · ${premium} × 300 EGP</span><strong>${money(premium*300)}</strong></div>`:''}<div class="row"><span>Subtotal</span><b>${money(total())}</b></div><div class="row"><span>Service fee · ${state.selected.size} × 15 EGP</span><b>${money(fee())}</b></div><div class="row"><span>VAT · 14%</span><b>${money(vat())}</b></div><div class="row total"><span>Total</span><span>${money(fullTotal())}</span></div></div><p class="small muted" style="margin-top:15px">These are reference-video prices and simulated taxes for a local demonstration, not a live commercial charge.</p>`}
function checkoutDetails(){return `<h2>Your details</h2><form id="customerForm" class="checkout-form"><div class="form-field full"><label for="clientEmail">Email address *</label><input id="clientEmail" type="email" placeholder="name@example.com" autocomplete="email" required value="${esc(state.checkoutContact.email)}"/></div><div class="form-field"><label for="clientFirst">First name *</label><input id="clientFirst" autocomplete="given-name" placeholder="First name" required value="${esc(state.checkoutContact.firstName)}"/></div><div class="form-field"><label for="clientLast">Surname *</label><input id="clientLast" autocomplete="family-name" placeholder="Surname" required value="${esc(state.checkoutContact.lastName)}"/></div><div class="form-field full"><label for="clientPhone">Mobile number (+20) *</label><input id="clientPhone" type="tel" autocomplete="tel" placeholder="+20 1XXXXXXXXX" required value="${esc(state.checkoutContact.phone)}"/></div><label class="checkrow"><input type="checkbox" id="clientMarketing" ${state.checkoutContact.marketing?'checked':''}/> Email me occasional cinema news and offers.</label></form><p class="error" id="formError"></p>`}
function checkoutPay(){return `<h2>Payment</h2><p class="muted">Review your booking and complete the test flow.</p><div class="pay-demo-box"><strong>DEMO PAYMENT MODE</strong><p class="small">No real banking gateway is connected. This button marks a sample booking as confirmed in the local server. No card data is collected.</p><p class="small">Total amount: <b>${money(fullTotal())}</b></p></div><p class="error" id="paymentError"></p>`}
function checkoutPage(){const labels=['Summary','Details','Payment'];const remaining=state.expiresAt?Math.max(0,Math.floor((state.expiresAt-Date.now())/1000)):600;return `<main id="main-content" class="checkout-page"><div class="checkout-card"><div class="checkout-top"><button class="icon-btn" data-action="back-to-seats" aria-label="Back to seats">‹</button><h1>Complete your booking</h1><span class="timer" id="timer">◷ ${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}</span></div><div class="checkout-steps">${labels.map((x,i)=>`<span class="${state.step===i+1?'on':''}">${i+1}. ${x}</span>`).join('')}</div><div class="checkout-body">${state.step===1?`<h2>Booking summary</h2>${checkoutSummary()}`:state.step===2?checkoutDetails():checkoutPay()}</div><div class="checkout-footer"><button class="btn btn-outline" data-action="checkout-back">‹ &nbsp; Back</button><button class="btn btn-white" data-action="checkout-next">${state.step===1?'Continue to details':state.step===2?'Continue to payment':`Confirm demo payment · ${money(fullTotal())}`} &nbsp; →</button></div></div></main>`}
function ticketPage(){const b=state.ticket;if(!b)return `<div class="ticket-view"><div class="ticket-paper"><h1>No ticket loaded</h1><a class="btn btn-white" href="#/movies">Explore movies</a></div></div>`;return `<main class="ticket-view" id="main-content"><div class="ticket-paper"><div class="label">FOX CINEMA</div><h1>You're going to the movies!</h1><p class="stamp">DEMO BOOKING CONFIRMED</p><p>${currFilm().title}</p><div class="ticket-row"><span>Cinema</span><b>${currCinema().name}</b></div><div class="ticket-row"><span>Date & time</span><b>${formatDate(state.dateOffset)} · ${state.time}</b></div><div class="ticket-row"><span>Seats</span><b>${[...state.selected].join(', ')}</b></div><div class="ticket-row"><span>Total</span><b>${money(fullTotal())}</b></div><div class="ticket-code">${b.ticketCode||b.bookingId}</div><p class="watermark">NOT VALID FOR REAL ADMISSION · NO MONEY CHARGED</p><div style="display:flex;justify-content:center;gap:10px;margin-top:20px"><button class="btn btn-white" data-action="print-ticket">Print</button><a href="#/home" class="btn btn-dark">Back to home</a></div></div></main>`}
const trailerRequests=new Map();
async function ensureOfficialTrailer(movie){
 if(!movie)return null;
 if(/^[A-Za-z0-9_-]{11}$/.test(movie.trailer||''))return movie.trailer;
 if(!trailerRequests.has(movie.id))trailerRequests.set(movie.id,(async()=>{
  const query=movie.isLive?`type=${encodeURIComponent(movie.mediaType==='tv'?'tv':'movie')}&id=${encodeURIComponent(movie.tmdbId)}`:`curated=${encodeURIComponent(movie.id)}`;
  const r=await fetch('/api/trailer?'+query,{cache:'default'});
  if(!r.ok)throw Error(r.status===503?'TMDb API is not yet available':'Trailer lookup failed');
  const data=await r.json();
  if(/^[A-Za-z0-9_-]{11}$/.test(data.trailer||'')){movie.trailer=data.trailer;return movie.trailer;}
  return null;
 })().catch(err=>{trailerRequests.delete(movie.id);throw err}));
 return trailerRequests.get(movie.id);
}
async function openMovieTrailer(){
 const movie=currFilm(),id=movie.id;
 state.trailerOpen=true;state.trailerError='';state.trailerLoading=!movie.trailer;render();
 if(movie.trailer)return;
 try{await ensureOfficialTrailer(movie)}catch(err){state.trailerError=err.message;}
 if(state.trailerOpen&&currFilm().id===id){state.trailerLoading=false;render();}
}
function overlays(){let html='';if(state.searchOpen)html+=`<div class="search-overlay" data-action="overlay-dismiss"><div class="dialog"><div class="dialog-head"><h2>Search FOX</h2><button class="icon-btn" data-action="search-close">×</button></div><input id="globalSearch" placeholder="${t('search')}" autocomplete="off" autofocus/><div class="suggestions" id="searchResults">${movies.slice(0,5).map(m=>`<a href="#/movie/${m.id}" data-action="modal-nav">${m.title} &nbsp; <span class="muted small">${labelGenre(m.genre)}</span></a>`).join('')}</div></div></div>`;
 if(state.authOpen)html+=`<div class="auth-overlay" data-action="overlay-dismiss"><div class="dialog"><div class="dialog-head"><h2>${state.account?'My account':state.authMode==='login'?'Sign in':'Create an account'}</h2><button class="icon-btn" data-action="auth-close">×</button></div>${state.account?`<p>Signed in as ${esc(state.account.name)} (${esc(state.account.email)})</p><button class="btn btn-outline" data-action="logout">Sign out</button>`:`<form id="authForm">${state.authMode==='register'?`<input id="authName" placeholder="Full name" required minlength="2"/>`:''}<input id="authEmail" placeholder="Email address" type="email" required/><input id="authPass" placeholder="Password" type="password" minlength="8" required/><p class="error" id="authError"></p><button class="btn btn-white" type="submit">${state.authMode==='login'?'Sign in':'Register'}</button></form><p class="hint">${state.authMode==='login'?'New here?':'Already have an account?'} <button class="pill" data-action="auth-toggle">${state.authMode==='login'?'Create account':'Sign in'}</button></p>`}<p class="hint">Accounts in this recreation are stored in a local demo database, not the original service.</p></div></div>`;
 if(state.trailerOpen){
  const movie=currFilm(),key=/^[A-Za-z0-9_-]{11}$/.test(movie.trailer||'')?movie.trailer:null;
  const media=state.trailerLoading?`<div class="trailer-loading" role="status">${state.lang==='ar'?'جارٍ البحث عن الإعلان الرسمي…':'Finding the official trailer…'}</div>`:
   key?`<div class="trailer-embed"><iframe src="https://www.youtube-nocookie.com/embed/${key}?autoplay=1&mute=0&playsinline=1&rel=0" title="${esc(movie.title)} official trailer" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div><a class="btn btn-outline trailer-direct" href="https://www.youtube.com/watch?v=${key}" target="_blank" rel="noopener noreferrer">${state.lang==='ar'?'مشاهدة الإعلان على يوتيوب ↗':'Watch official trailer on YouTube ↗'}</a>`:
   `<div class="trailer-empty">${moviePoster(movie)}<p>${state.lang==='ar'?'لم يُنشر تريلر أو إعلان تشويقي رسمي قابل للعرض لهذا الفيلم بعد.':'The official trailer has not been released or is unavailable for embedding.'}</p>${state.trailerError?`<small>${esc(state.trailerError)}</small>`:''}</div>`;
  html+=`<div class="trailer-overlay" data-action="overlay-dismiss"><div class="dialog trailer-dialog"><div class="dialog-head"><h2>${esc(movieName(movie))} — ${t('trailer')}</h2><button class="icon-btn" data-action="trailer-close" aria-label="Close">×</button></div>${media}<button class="btn btn-white" data-action="trailer-close">${state.lang==='ar'?'إغلاق':'Close'}</button></div></div>`;
 }

 return html;
}
let revealObserver=null;
const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// Per-word masked typography: HTML characters remain genuine selectable text,
// no image / screenshot is used for transitions.
function animateHeadingWords(heading){
 if(heading.dataset.foxWords==='1')return;
 heading.dataset.foxWords='1';heading.classList.add('fox-word-heading');let index=0;
 const visit=node=>{
  for(const child of [...node.childNodes]){
   if(child.nodeType!==Node.TEXT_NODE){if(child.nodeType===Node.ELEMENT_NODE)visit(child);continue;}
   const frag=document.createDocumentFragment();
   for(const part of child.nodeValue.split(/(\s+)/u)){
    if(!part)continue;
    if(/^\s+$/u.test(part)){frag.appendChild(document.createTextNode(part));continue;}
    const clip=document.createElement('span');clip.className='fox-word-clip';
    const word=document.createElement('span');word.className='fox-word-inner';word.style.setProperty('--word-delay',`${Math.min(index++,8)*73}ms`);
    word.textContent=part;clip.appendChild(word);frag.appendChild(clip);
   }
   child.replaceWith(frag);
  }
 };
 visit(heading);
}
function installCinematicMotion(){
 revealObserver?.disconnect();revealObserver=null;
 if(router()==='3d')return;
 const headings=[...document.querySelectorAll('.hero-title,.section h2,.page-heading,.format-banner h1,.movie-detail-head h1,.food-banner h2')];
 if(!reducedMotion())headings.forEach(animateHeadingWords);
 if(reducedMotion()||!('IntersectionObserver' in window))return;
 const nodes=[...document.querySelectorAll('.section-head, .movie-card, .format-card, .offer-card, .cinema-card, .gallery-grid > *, .food-grid > *, .detail-columns > *, .page-heading, .food-banner .copy, .detail-stats > div, .show-cinema, .footer-grid > div, .format-banner h1, .movie-detail-head h1, .hero-title')];
 if(!nodes.length)return;
 revealObserver=new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){
   const node=entry.target;node.classList.add('reveal-visible');
   node.querySelectorAll('.fox-word-heading').forEach(x=>x.classList.add('headline-visible'));
   if(node.classList.contains('fox-word-heading'))node.classList.add('headline-visible');
   revealObserver?.unobserve(node);
  }
 },{rootMargin:'0px 0px -65px 0px',threshold:.10});
 nodes.forEach((node,index)=>{
  node.classList.add('cinema-reveal');
  // Stagger by a local group rather than across unrelated screen sections.
  const i=[...node.parentElement?.children||[]].indexOf(node);
  node.style.setProperty('--reveal-delay',`${Math.max(0,Math.min(i,5))*85}ms`);
  revealObserver.observe(node);
 });
 // The hero is visible on page load and should reveal immediately.
 const hero=document.querySelector('.hero-title');if(hero){hero.classList.add('reveal-visible','headline-visible');revealObserver.unobserve(hero);}
}
function showRouteBrand(destination){
 if(reducedMotion()||!(destination.startsWith('movie/')||destination.startsWith('format/')))return;
 if(!document.body?.appendChild||!document.createElement)return;
 const old=document.getElementById('foxRouteBrand');old?.remove?.();
 const splash=document.createElement('div');splash.id='foxRouteBrand';splash.className='fox-route-brand';
 splash.setAttribute('aria-hidden','true');splash.textContent='FOX';document.body.appendChild(splash);
 setTimeout(()=>splash.remove?.(),680);
}
function renderRoute(){
 const destination=router();
 const enteringTheater=destination==='3d';
 const exitingTheater=!!document.querySelector('.theater-page');
 const update=()=>{render();if(document.documentElement.dataset)document.documentElement.dataset.foxRoute=enteringTheater?'theater':'page';window.scrollTo({top:0,behavior:'instant'});if(router().startsWith('seats/'))loadTaken();};
 // WebGL has an independent cinematic camera flight. Don't snapshot its canvas
 // into a view transition: Safari can capture an empty GPU framebuffer.
 if(enteringTheater||exitingTheater){update();return;}
 showRouteBrand(destination);
 if(typeof document.startViewTransition==='function'&&!reducedMotion()){
  try{document.startViewTransition(update);return;}catch(error){console.warn('View transition not available:',error);}
 }
 update();const main=document.querySelector('#app > main, #app .theater-page');
 if(main&&!reducedMotion()&&main.animate)main.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:460,easing:'cubic-bezier(.2,.85,.22,1)'});
}
function render(){const r=router();if(heroClock){clearInterval(heroClock);heroClock=null;}if(renderer){renderer.dispose();renderer=null;}if(ticker){clearInterval(ticker);ticker=null;}
 let html;if(r==='home')html=home();else if(r==='movies')html=moviesPage();else if(r==='cinemas')html=cinemasPage();else if(r.startsWith('cinema/'))html=cinemaPage(r.slice(7));else if(r==='formats')html=formatsPage();else if(r.startsWith('format/'))html=formatPage(r.slice(7));else if(r==='offers')html=offersPage();else if(r.startsWith('offer/'))html=offerPage(r.slice(6));else if(r==='food')html=foodPage();else if(r.startsWith('movie/'))html=movieDetailPage(r.slice(6));else if(r.startsWith('seats/'))html=seatPage(r.slice(6));else if(r==='3d')html=theaterPage();else if(r==='checkout')html=checkoutPage();else if(r==='ticket')html=ticketPage();else html=home();site().innerHTML=html+overlays();document.documentElement.lang=state.lang;document.documentElement.dir=state.lang==='ar'?'rtl':'ltr';localizeUI(site(),state.lang);hydrateFilmPosters(site(),true);if(r==='3d')requestAnimationFrame(async()=>{
 const canvas=$('#theaterCanvas');if(!canvas||router()!=='3d')return;
 const overlay=document.createElement('div');overlay.className='theater-loading';overlay.textContent=state.lang==='ar'?'بنجهّز القاعة السينمائية...':'Preparing cinematic auditorium…';canvas.parentElement.appendChild(overlay);
 try{
   const [{TheaterThree}]=await Promise.all([import('./theater-three.js'),ensureOfficialTrailer(currFilm()).catch(()=>null)]);
   if(router()!=='3d'||!canvas.isConnected)return;
   renderer=new TheaterThree(canvas,undefined,state.movieId,state.screenFormat);
 }catch(error){
   console.warn('Three.js unavailable; using WebGL compatible scene:',error);
   if(router()!=='3d'||!canvas.isConnected)return;
   try{renderer=new LegacyTheater3D(canvas,undefined,state.movieId);}catch(e){
    console.error(e);canvas.insertAdjacentHTML('afterend',`<div class="webgl-fallback">Cinema preview unavailable: ${esc(e.message)}. <button class="btn btn-white" data-action="back-to-seats">Back to seats</button></div>`);
   }
 }finally{overlay.remove();}
 if(renderer&&router()==='3d')renderer.setSeat(state.viewer,false);
});if(r==='3d'){setHudOpen(false);}if(r==='checkout'){ticker=setInterval(updateTimer,1000);updateTimer()}if(state.searchOpen)$('#globalSearch')?.focus();requestAnimationFrame(installCinematicMotion);if(r==='home')startHeroClock();}
function setHudOpen(next){
 const page=document.querySelector('.theater-page');
 const panel=document.getElementById('theaterHud');
 const toggle=document.querySelector('.hud-toggle');
 if(!page||!panel||!toggle)return;
 const mobile=window.matchMedia('(max-width:720px)').matches;
 const wasOpen=state.hudOpen;
 state.hudOpen=mobile&&Boolean(next);
 page.classList.toggle('hud-open',state.hudOpen);
 toggle.setAttribute('aria-expanded',String(state.hudOpen));
 toggle.setAttribute('aria-label',state.lang==='ar'?(state.hudOpen?'إخفاء تفاصيل المقعد':'عرض تفاصيل المقعد'):(state.hudOpen?'Hide seat details':'Show seat details'));
 const copy=toggle.querySelector('.hud-toggle-copy');if(copy)copy.textContent=state.lang==='ar'?(state.hudOpen?'إغلاق':'التفاصيل'):(state.hudOpen?'Close':'Details');
 const arrow=toggle.querySelector('.hud-toggle-chevron');if(arrow)arrow.textContent=state.hudOpen?'›':'‹';
 if(!state.hudOpen&&wasOpen&&panel.contains(document.activeElement))toggle.focus({preventScroll:true});
 panel.inert=mobile&&!state.hudOpen;
 panel.setAttribute('aria-hidden',String(mobile&&!state.hudOpen));
 if(mobile&&state.hudOpen&&!wasOpen)requestAnimationFrame(()=>panel.querySelector('.hud-dismiss')?.focus({preventScroll:true}));
}
function updateTimer(){const el=$('#timer');if(!el)return;const seconds=Math.max(0,Math.floor(((state.expiresAt||Date.now()+600000)-Date.now())/1000));el.textContent=`◷ ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;el.classList.toggle('warning',seconds<60);if(seconds===0){clearInterval(ticker);toast('Your seats were released. Please select seats again.');state.holdId=null;routeTo('seats/'+state.movieId)}}
async function loadTaken(){try{const data=await api('/api/seats?show='+encodeURIComponent(showId()));state.taken=new Set(data.taken);if(data.hold?.id){state.holdId=data.hold.id;state.expiresAt=data.hold.expiresAt}}catch(e){state.taken=new Set(defaultTaken);toast('Offline seat data is shown; start the project with node server.js for holds.')}if(router().startsWith('seats/'))render()}
function startSeats(movieId,cinemaId=null,time=null){state.movieId=movieId;state.cinemaId=cinemaId||state.cinemaId;state.time=time||state.time;state.selected.clear();state.holdId=null;state.expiresAt=null;state.step=1;state.zoom=1;routeTo('seats/'+movieId);loadTaken()}
async function checkoutStart(){if(!state.selected.size){toast('Please select at least one seat');return;}try{const hold=await api('/api/holds','POST',{showId:showId(),seats:[...state.selected]});state.holdId=hold.holdId;state.expiresAt=hold.expiresAt;state.step=1;routeTo('checkout')}catch(e){toast(e.message);await loadTaken();}}
async function checkoutNext(){if(!state.holdId){toast('Choose seats to start a booking.');routeTo('seats/'+state.movieId);return;}if(state.step===1){state.step=2;render();return;}if(state.step===2){const p={holdId:state.holdId,email:$('#clientEmail')?.value.trim(),firstName:$('#clientFirst')?.value.trim(),lastName:$('#clientLast')?.value.trim(),phone:$('#clientPhone')?.value.trim(),marketing:$('#clientMarketing')?.checked};state.checkoutContact=p;try{const b=await api('/api/bookings','POST',p);state.bookingId=b.bookingId;state.step=3;render()}catch(e){const el=$('#formError');if(el)el.textContent=e.message;else toast(e.message)}return;}try{const result=await api('/api/pay-demo','POST',{bookingId:state.bookingId});state.ticket=result;routeTo('ticket')}catch(e){toast(e.message)}}
async function authSubmit(e){e.preventDefault();const p={email:$('#authEmail').value.trim(),password:$('#authPass').value};if(state.authMode==='register')p.name=$('#authName').value.trim();try{const result=await api('/api/'+(state.authMode==='register'?'register':'login'),'POST',p);state.account=result.profile;state.authOpen=false;toast('Welcome to FOX CINEMA');render()}catch(e){$('#authError').textContent=e.message}}
function updateFilmResults(){const results=$('#filmResults');if(!results)return;let filtered=uniqueMoviesForMode(movies,state.filmMode).filter(isPublishedFilm);if(state.query)filtered=filtered.filter(m=>`${m.title} ${m.arabic} ${labelGenre(m.genre)} ${m.cast}`.toLowerCase().includes(state.query.toLowerCase()));if(state.genre)filtered=filtered.filter(m=>m.genre===state.genre);if(state.format)filtered=filtered.filter(m=>m.format.includes(state.format));if(state.language)filtered=filtered.filter(m=>m.language===state.language);results.innerHTML=filtered.length?filtered.map(movieCard).join(''):'<div class="empty-state">No matching movies. Try adjusting your filters.</div>';localizeUI(results,state.lang);hydrateFilmPosters(results)}
// Delegated event handlers survive route and UI re-rendering.
document.addEventListener('click',async e=>{const el=e.target.closest('[data-action]');if(!el)return;const action=el.dataset.action,id=el.dataset.id;switch(action){
 case 'close-nav':state.navOpen=false;break;
 case 'menu':state.navOpen=!state.navOpen;render();break;
 case 'lang':state.lang=state.lang==='en'?'ar':'en';if(typeof localStorage!=='undefined')localStorage.setItem('fox-language',state.lang);render();break;
 case 'search-open':state.searchOpen=true;render();break;
 case 'search-close':state.searchOpen=false;render();break;
 case 'auth-open':state.authOpen=true;render();break;
 case 'auth-close':state.authOpen=false;render();break;
 case 'auth-toggle':state.authMode=state.authMode==='login'?'register':'login';render();break;
 case 'logout':await api('/api/logout','POST',{});state.account=null;state.authOpen=false;render();break;
 case 'overlay-dismiss':if(e.target===el){state.searchOpen=false;state.authOpen=false;state.trailerOpen=false;render()}break;
 case 'modal-nav':state.searchOpen=false;state.authOpen=false;break;
 case 'trailer-open':state.movieId=id||((router()==='home')?featuredMovies()[state.hero%featuredMovies().length].id:state.movieId);await openMovieTrailer();break;
 case 'trailer-close':state.trailerOpen=false;render();break;
 case 'open-movie':if(e.target.closest('a'))break;routeTo('movie/'+id);break;
 case 'book-movie':if(getMovie(id).coming||getMovie(id).isLive){toast(state.lang==='ar'?'هذا الفيلم قريباً، والحجز غير متاح بعد.':'Coming soon — booking is not open yet.');break;}state.movieId=id;state.cinemaId='city-centre-alexandria';state.dateOffset=2;state.screenFormat='Standard';routeTo('movie/'+id);setTimeout(()=>$('#showtimes')?.scrollIntoView({behavior:'smooth'}),100);break;
 case 'hero-prev':advanceHero(-1);startHeroClock();break;
 case 'hero-next':advanceHero(1);startHeroClock();break;
 case 'hero-select':advanceHero(Number(el.dataset.index)-state.hero);startHeroClock();break;
 case 'film-mode':state.filmMode=el.dataset.value;render();break;
 case 'select-date':state.dateOffset=Number(el.dataset.offset);render();break;
 case 'detail-cinema':state.cinemaId=id;render();break;
 case 'choose-show':if(getMovie(el.dataset.movie).coming||getMovie(el.dataset.movie).isLive)break;state.cinemaId=el.dataset.cinema;state.movieId=el.dataset.movie;state.time=el.dataset.time;state.screenFormat=el.dataset.format||'Standard';startSeats(state.movieId,state.cinemaId,state.time);break;
 case 'quick-book':{const m=$('#quickMovie')?.value;const c=$('#quickCinema')?.value;state.cinemaId=c!=='all'?c:'city-centre-alexandria';state.dateOffset=Number($('#quickDate')?.value||0);state.movieId=m!=='all'?m:'godzilla-minus-zero';state.screenFormat='Standard';routeTo('movie/'+state.movieId);setTimeout(()=>$('#showtimes')?.scrollIntoView({behavior:'smooth'}),100);break;}
 case 'back-movie':routeTo('movie/'+state.movieId);break;
 case 'booking-info':toast('Regular 180 EGP · Premium recliner 300 EGP · maximum 9 seats');break;
 case 'seat':if(!state.taken.has(id)){if(state.selected.has(id))state.selected.delete(id);else if(state.selected.size<9)state.selected.add(id);else{toast('Maximum 9 seats per booking.');break;}if(!state.selected.has(state.viewer))state.viewer=[...state.selected][0]||'G9';render()}break;
 case 'seat-time':state.time=el.dataset.time;state.selected.clear();state.holdId=null;await loadTaken();render();break;
 case 'zoom-minus':state.zoom=Math.max(window.matchMedia('(max-width:720px)').matches?1:.72,+(state.zoom-.15).toFixed(2));render();break;
 case 'zoom-plus':state.zoom=Math.min(2,+(state.zoom+.15).toFixed(2));render();break;
 case 'sample-seats':state.selected=new Set(featuredSeats.filter(id=>!state.taken.has(id)));state.viewer='G2';render();break;
 case 'open-3d':if(!state.selected.size)return;state.viewer=state.selected.has(state.viewer)?state.viewer:[...state.selected][0];routeTo('3d');break;
 case 'back-to-seats':routeTo('seats/'+state.movieId);break;
 case 'change-view':state.viewer=id;renderer?.setSeat(id);$('#viewLabel').textContent=state.screenFormat+' · '+(state.lang==='ar'?'العرض من المقعد ':'View from ')+id;$('#hudContent').innerHTML=hudContent();localizeUI($('#hudContent'),state.lang);break;
 case 'hud-toggle':setHudOpen(!state.hudOpen);break;
 case '3d-reset':renderer?.reset();break;
 case '3d-sound':{
   state.theaterMuted=!state.theaterMuted;
   if(!renderer?.setSoundEnabled){toast(state.lang==='ar'?'التحكم بالصوت غير متاح في وضع العرض البديل.':'Sound control unavailable in compatibility renderer.');break;}
   const status=renderer.setSoundEnabled(!state.theaterMuted);
   const btn=$('#theaterSound');if(btn){btn.setAttribute('aria-pressed',String(!state.theaterMuted));btn.setAttribute('aria-label',state.theaterMuted?'Enable trailer sound':'Mute trailer');btn.innerHTML=state.theaterMuted?'🔇 <span>Sound off</span>':'🔊 <span>Sound on</span>';}
   if(status===false)toast(state.lang==='ar'?'الصوت متاح عند بدء تشغيل التريلر.':'Sound control activates when the trailer starts.');
   break;
 }
 case 'start-checkout':await checkoutStart();break;
 case 'checkout-back':if(state.step>1){state.step--;render()}else routeTo('seats/'+state.movieId);break;
 case 'checkout-next':await checkoutNext();break;
 case 'print-ticket':window.print();break;
 case 'food-filter':state.foodCategory=id;render();break;
 case 'food-plus':state.cart[id]=(state.cart[id]||0)+1;render();break;
 case 'food-minus':state.cart[id]=Math.max(0,(state.cart[id]||0)-1);render();break;
 case 'food-order':toast('Your demo snack order has been recorded locally. No charge was made.');state.cart={};render();break;
 }});
document.addEventListener('input',e=>{if(e.target.id==='filmQuery'){state.query=e.target.value;updateFilmResults()}if(e.target.id==='globalSearch'){const q=e.target.value.toLowerCase();$('#searchResults').innerHTML=movies.filter(m=>isPublishedFilm(m)&&`${m.title} ${m.arabic} ${labelGenre(m.genre)}`.toLowerCase().includes(q)).map(m=>`<a href="#/movie/${m.id}" data-action="modal-nav">${m.title}</a>`).join('')||'<div class="muted">No matches</div>'}});
document.addEventListener('change',e=>{if(e.target.id==='filmGenre')state.genre=e.target.value;if(e.target.id==='filmFormat')state.format=e.target.value;if(e.target.id==='filmLanguage')state.language=e.target.value;if(['filmGenre','filmFormat','filmLanguage'].includes(e.target.id))updateFilmResults();if(e.target.id==='foodCinema')state.foodCinema=e.target.value});
document.addEventListener('submit',async e=>{if(e.target.id==='authForm')return await authSubmit(e);if(e.target.id==='newsletter'){e.preventDefault();toast('Thanks! Newsletter sign-up is a demo in this reconstruction.')}if(e.target.id==='customerForm'){e.preventDefault();await checkoutNext()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(state.searchOpen||state.authOpen||state.trailerOpen)){state.searchOpen=state.authOpen=state.trailerOpen=false;render()}if(e.key==='Enter'&&e.target.matches('.movie-card'))routeTo('movie/'+e.target.dataset.id)});
let scrollTick=false;
window.addEventListener('scroll',()=>{
 if(scrollTick||reducedMotion()||router()!=='home')return;
 scrollTick=true;requestAnimationFrame(()=>{scrollTick=false;const layer=document.querySelector('.hero-bg');
 if(layer){const y=Math.min(700,window.scrollY||0);layer.style.setProperty('--fox-parallax-y',`${Math.round(y*.13)}px`);}
 });
},{passive:true});
window.addEventListener('hashchange',()=>{state.searchOpen=state.authOpen=state.trailerOpen=false;renderRoute();});
try{const response=await api('/api/me');state.account=response.account}catch{}
if(!location.hash)location.hash='#/home';else{render();if(router().startsWith('seats/'))loadTaken()}
async function refreshPublicCatalogue(){
 let snapshot=null;
 try{
  const response=await fetch('/api/catalog',{cache:'default',headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Vercel API '+response.status);
  snapshot=await response.json();
 }catch(e){
  // Keep backward compatibility with the old static snapshot, and never blank the UI.
  try{
   const backup=await fetch('/data/entertainment.json',{cache:'default'});
   if(backup.ok)snapshot=await backup.json();
  }catch{}
 }
 if(!snapshot||!Array.isArray(snapshot.titles))return;
 const previous=state.catalogueUpdated;
 const res=mergeCatalogue(movies,snapshot);
 state.catalogueUpdated=res.generatedAt;state.catalogueCount=snapshot.count||res.added;
 if((router()==='movies'||router().startsWith('movie/'))&&(res.added||res.updated||(res.generatedAt&&res.generatedAt!==previous)))render();
}
refreshPublicCatalogue();const catalogueClock=setInterval(refreshPublicCatalogue,3600000);catalogueClock.unref?.();


window.addEventListener('keydown',event=>{if(event.key==='Escape'&&router()==='3d'&&state.hudOpen)setHudOpen(false)});
window.addEventListener('resize',()=>{if(router()==='3d')setHudOpen(state.hudOpen)},{passive:true});
