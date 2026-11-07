(function(){
  var KEY='ecoastuce-consent';
  var ADS='ca-pub-1800081150235092';
  var GA='G-QDDWLW0SJZ';
  // Identifiants des blocs d'annonces (AdSense > Annonces > Par bloc d'annonces > Annonce display responsive).
  // Tant qu'un identifiant est vide, l'emplacement correspondant reste invisible : aucune case vide.
  var SLOTS={article_mid:'',article_end:''};

  function renderAds(){
    var els=document.querySelectorAll('.eco-ad[data-slot]');
    for(var i=0;i<els.length;i++){
      var el=els[i],id=SLOTS[el.getAttribute('data-slot')];
      if(!id||el.getAttribute('data-ready')) continue;
      el.setAttribute('data-ready','1');
      el.innerHTML='<small>Publicité</small><ins class="adsbygoogle" style="display:block" data-ad-client="'+ADS+'" data-ad-slot="'+id+'" data-ad-format="auto" data-full-width-responsive="true"></ins>';
      el.hidden=false;
      try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}
    }
  }

  function loadGoogle(){
    if(window.__ecoGoogleLoaded) return;
    window.__ecoGoogleLoaded=true;
    var s1=document.createElement('script');
    s1.async=true;
    s1.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+ADS;
    s1.crossOrigin='anonymous';
    document.head.appendChild(s1);
    var s2=document.createElement('script');
    s2.async=true;
    s2.src='https://www.googletagmanager.com/gtag/js?id='+GA;
    document.head.appendChild(s2);
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){dataLayer.push(arguments)};
    gtag('js',new Date());
    gtag('config',GA);
    renderAds();
  }

  function removeBanner(){
    var b=document.getElementById('eco-consent');
    if(b) b.remove();
  }

  function showBanner(){
    var b=document.createElement('div');
    b.id='eco-consent';
    b.setAttribute('role','dialog');
    b.setAttribute('aria-label','Gestion des cookies');
    b.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99;background:#091827;color:#fff;padding:16px 20px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;font:14px/1.5 system-ui,sans-serif;box-shadow:0 -4px 20px #0006';
    b.innerHTML='<p style="margin:0;max-width:760px">EcoAstuce utilise des cookies pour mesurer l\'audience et, si tu l\'acceptes, afficher des publicités. Tu peux changer d\'avis à tout moment. <a href="/confidentialite.html" style="color:#66edaa">En savoir plus</a></p><div style="display:flex;gap:10px"><button id="eco-refuse" style="padding:10px 18px;border-radius:22px;border:1px solid #66edaa;background:transparent;color:#fff;cursor:pointer">Refuser</button><button id="eco-accept" style="padding:10px 18px;border-radius:22px;border:0;background:#66edaa;color:#072c20;font-weight:700;cursor:pointer">Accepter</button></div>';
    document.body.appendChild(b);
    document.getElementById('eco-accept').onclick=function(){localStorage.setItem(KEY,'yes');removeBanner();loadGoogle();};
    document.getElementById('eco-refuse').onclick=function(){localStorage.setItem(KEY,'no');removeBanner();};
  }

  window.ecoConsentReset=function(){
    localStorage.removeItem(KEY);
    removeBanner();
    showBanner();
  };

  document.addEventListener('DOMContentLoaded',function(){
    var c=localStorage.getItem(KEY);
    if(c==='yes') loadGoogle();
    else if(c!=='no') showBanner();
  });
})();
