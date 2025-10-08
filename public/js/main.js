$(async function(){
  const socket = io();

  // ====== Nav user + summary ======
  $.getJSON("/api/me/profile", res=>{
    if(res.ok && res.user){
      $("#navUser").html(`
        <span style="margin-right:10px">Hi, <b>${res.user.username}</b></span>
        <a class="btn secondary" href="/api/auth/logout" onclick="event.preventDefault(); $.post('/api/auth/logout',()=>location='/login');">Logout</a>
      `);
    } else {
      location.href="/login";
    }
  });
  function loadSummary(){
    $.getJSON("/api/me/summary", res=>{
      if(!res.ok) return;
      $("#summaryRow").html(`
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div class="badge green">Wallets: ${res.totalWallets}</div>
          <div class="badge ${res.activeWallets>0?'green':'red'}">Active: ${res.activeWallets}</div>
        </div>
      `);
    });
  }
  loadSummary();

  // ====== Wallets ======
  const $walletList = $("#walletList");
  const $selWallet  = $("#selWallet");

  function refreshWalletOptions(wallets){
    $selWallet.empty();
    wallets.forEach(w=>{
      $selWallet.append(`<option value="${w.id}">${w.address} ${w.active?'(active)':''}</option>`);
    });
  }
  function loadWallets(){
    $.getJSON("/api/wallets", res=>{
      if(!res.ok) return toastr.error("Cannot load wallets");
      $walletList.empty();
      refreshWalletOptions(res.wallets);
      res.wallets.forEach(w=>{
        $walletList.append(`
          <li>
            <div>
              <div>${w.address}</div>
              <div class="badge ${w.active?'green':'red'}">${w.active?'ACTIVE':'INACTIVE'}</div>
            </div>
            <div>
              <button class="btn btn-toggle" data-id="${w.id}">${w.active?'Disable':'Enable'}</button>
              <button class="btn secondary btn-start" data-id="${w.id}">Start Now</button>
            </div>
          </li>
        `);
      });
      loadSummary();
    });
  }
  loadWallets();

  $("#formAddWallet").on("submit", function(e){
    e.preventDefault();
    $.post("/api/wallets", $(this).serialize(), res=>{
      if(res.ok){ toastr.success("Wallet added"); this.reset(); loadWallets(); }
      else toastr.error(res.error||"Failed");
    });
  });
  $(document).on("click", ".btn-toggle", function(){
    const id = $(this).data("id");
    $.ajax({ url:`/api/wallets/${id}/toggle`, method:"PATCH" })
    .done(res=>{
      if(res.ok){ toastr.success("Updated"); loadWallets(); }
      else toastr.error(res.error||"Failed");
    });
  });
  $(document).on("click", ".btn-start", function(){
    const id = $(this).data("id");
    $.post("/api/bot/start", { walletId:id }, res=>{
      if(res.ok) toastr.info("Started");
      else toastr.error(res.error||"Failed");
    });
  });

  // ====== Interactions (AJAX paginated) ======
  let interCursor = null;
  function renderInteractions(items, append=false){
    const $list = $("#interactionList");
    if(!append) $list.empty();
    items.forEach(x=>{
      const preview = (x.response||"").slice(0,220);
      $list.append(`
        <li>
          <div>
            <div><b>#${x.id}</b> (${new Date(x.createdAt).toLocaleString()})</div>
            <div>Q: ${x.question}</div>
            <div style="opacity:.85">A: ${preview}${x.response && x.response.length>220?'...':''}</div>
          </div>
        </li>
      `);
    });
  }
  function loadInteractions(reset=true){
    const walletId = $selWallet.val();
    if(!walletId) return;
    const q = $.param({ walletId, limit:20, cursor: reset? "" : interCursor });
    $.getJSON(`/api/interactions?${q}`, res=>{
      if(!res.ok) return toastr.error(res.error||"Failed");
      renderInteractions(res.items, !reset);
      interCursor = res.nextCursor;
      $("#btnMoreInteractions").toggle(!!interCursor);
    });
  }
  $("#btnLoadInteractions").on("click", ()=> loadInteractions(true));
  $("#btnMoreInteractions").on("click", ()=> loadInteractions(false));

  // ====== Logs realtime (Socket.IO + filter optional) ======
  const $logs = $("#logs");
  const $filter = $("#filterWallet");
  socket.on("log", data=>{
    const filterVal = $filter.val()?.trim();
    if(filterVal && data.wallet.toLowerCase() !== filterVal.toLowerCase()) return;
    const cls = `log ${data.type}`;
    $logs.prepend(`<div class="${cls}">[${data.time}] [${data.wallet}] ${data.msg}</div>`);
  });
  // wallet summary badges live (opsional)
  socket.on("walletSummary", s=>{
    toastr.info(`Wallet ${s.address} XP=${s.points ?? '-'} (updated)`);
  });
});
