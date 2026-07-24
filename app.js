import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc,
  collection, addDoc, onSnapshot, deleteDoc, serverTimestamp,
  query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const TRIAL_DIAS = 7;
const PRECO_MENSAL = 399;

let uidAtual = null;
let lojaAtual = null;
let devedores = [];
let devedorAbertoId = null;
let unsubDevedores = null;
let unsubComprovativos = null;

const $ = (id) => document.getElementById(id);
const fmtMZN = (v) => (v || 0).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MZN";
const hoje = () => new Date().toISOString().slice(0, 10);

function mostrarTela(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  $(id).classList.remove("hidden");
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._h);
  toast._h = setTimeout(() => t.classList.add("hidden"), 2600);
}

/* =========================================================
   AUTENTICAÇÃO
========================================================= */

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
    tab.classList.add("is-active");
    const alvo = tab.dataset.tab;
    $("form-login").classList.toggle("hidden", alvo !== "login");
    $("form-registo").classList.toggle("hidden", alvo !== "registo");
  });
});

$("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("login-erro").textContent = "";
  try {
    await signInWithEmailAndPassword(auth, $("login-email").value.trim(), $("login-senha").value);
  } catch (err) {
    $("login-erro").textContent = traduzErroAuth(err);
  }
});

$("form-registo").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("registo-erro").textContent = "";
  const nomeLoja = $("registo-loja").value.trim();
  const telefone = $("registo-telefone").value.trim();
  try {
    const cred = await createUserWithEmailAndPassword(
      auth, $("registo-email").value.trim(), $("registo-senha").value
    );
    const validoAte = new Date();
    validoAte.setDate(validoAte.getDate() + TRIAL_DIAS);
    await setDoc(doc(db, "lojas", cred.user.uid), {
      nomeLoja, telefone,
      criadaEm: serverTimestamp(),
      assinatura: { status: "trial", validoAte: validoAte.toISOString() }
    });
  } catch (err) {
    $("registo-erro").textContent = traduzErroAuth(err);
  }
});

$("btn-logout").addEventListener("click", () => signOut(auth));

function traduzErroAuth(err) {
  const c = err.code || "";
  if (c.includes("email-already-in-use")) return "Este e-mail já tem uma conta.";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found"))
    return "E-mail ou palavra-passe incorretos.";
  if (c.includes("weak-password")) return "A palavra-passe precisa de pelo menos 6 caracteres.";
  return "Não foi possível concluir. Tente novamente.";
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    uidAtual = user.uid;
    const snap = await getDoc(doc(db, "lojas", user.uid));
    lojaAtual = snap.exists() ? snap.data() : {};
    $("app-nome-loja").textContent = lojaAtual.nomeLoja || "A minha loja";
    escutarDevedores();
    escutarComprovativos();
    atualizarBannerAssinatura();
    mostrarTela("screen-app");
  } else {
    uidAtual = null;
    lojaAtual = null;
    if (unsubDevedores) unsubDevedores();
    if (unsubComprovativos) unsubComprovativos();
    mostrarTela("screen-auth");
  }
});

/* =========================================================
   NAVEGAÇÃO / MENU
========================================================= */

$("btn-menu").addEventListener("click", () => $("menu-lateral").classList.remove("hidden"));
$("btn-fechar-menu").addEventListener("click", () => $("menu-lateral").classList.add("hidden"));
document.querySelectorAll("[data-nav]").forEach((b) =>
  b.addEventListener("click", () => {
    $("menu-lateral").classList.add("hidden");
    if (b.dataset.nav === "app") mostrarTela("screen-app");
    if (b.dataset.nav === "assinatura") { renderAssinatura(); mostrarTela("screen-assinatura"); }
  })
);
$("btn-voltar-assinatura").addEventListener("click", () => mostrarTela("screen-app"));
$("btn-voltar-detalhe").addEventListener("click", () => mostrarTela("screen-app"));

/* =========================================================
   DEVEDORES — lista em tempo real
========================================================= */

function escutarDevedores() {
  const col = query(collection(db, "lojas", uidAtual, "devedores"), orderBy("criadoEm", "desc"));
  unsubDevedores = onSnapshot(col, (snap) => {
    devedores = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderLista();
    if (devedorAbertoId) renderDetalhe(devedorAbertoId);
  });
}

function renderLista(filtro = "") {
  const cont = $("lista-devedores");
  const termo = filtro.trim().toLowerCase();
  const visiveis = devedores.filter((d) => d.nome.toLowerCase().includes(termo));

  let totalDevido = 0;
  devedores.forEach((d) => { totalDevido += saldoDevedor(d); });
  $("app-total-devido").textContent = fmtMZN(totalDevido);

  cont.innerHTML = "";
  $("lista-vazia").classList.toggle("hidden", devedores.length > 0);

  visiveis.forEach((d) => {
    const saldo = saldoDevedor(d);
    const linha = document.createElement("div");
    linha.className = "linha-devedor";
    linha.innerHTML = `
      <div>
        <p class="linha-devedor__nome">${escapeHtml(d.nome)}</p>
        <p class="linha-devedor__data">${formatarData(d.data)}${d.descricao ? " · " + escapeHtml(d.descricao) : ""}</p>
      </div>
      <span class="linha-devedor__valor ${saldo <= 0 ? "linha-devedor__valor--pago" : ""}">
        ${saldo <= 0 ? "Pago" : fmtMZN(saldo)}
      </span>`;
    linha.addEventListener("click", () => abrirDetalhe(d.id));
    cont.appendChild(linha);
  });
}

$("input-busca").addEventListener("input", (e) => renderLista(e.target.value));

function saldoDevedor(d) {
  const pago = (d.pagamentos || []).reduce((s, p) => s + p.valor, 0);
  return Math.max(0, (d.valorTotal || 0) - pago);
}

/* =========================================================
   NOVO / EDITAR DEVEDOR
========================================================= */

let modoEdicaoId = null;

$("btn-novo-devedor").addEventListener("click", () => {
  modoEdicaoId = null;
  $("modal-devedor-titulo").textContent = "Novo devedor";
  $("form-devedor").reset();
  $("dev-data").value = hoje();
  $("dev-erro").textContent = "";
  $("modal-devedor").classList.remove("hidden");
});

$("btn-editar-devedor").addEventListener("click", () => {
  const d = devedores.find((x) => x.id === devedorAbertoId);
  if (!d) return;
  modoEdicaoId = d.id;
  $("modal-devedor-titulo").textContent = "Editar devedor";
  $("dev-nome").value = d.nome;
  $("dev-telefone").value = d.telefone || "";
  $("dev-valor").value = d.valorTotal;
  $("dev-data").value = d.data;
  $("dev-descricao").value = d.descricao || "";
  $("dev-erro").textContent = "";
  $("modal-devedor").classList.remove("hidden");
});

$("btn-cancelar-devedor").addEventListener("click", () => $("modal-devedor").classList.add("hidden"));

$("form-devedor").addEventListener("submit", async (e) => {
  e.preventDefault();
  const dados = {
    nome: $("dev-nome").value.trim(),
    telefone: $("dev-telefone").value.trim(),
    valorTotal: parseFloat($("dev-valor").value),
    data: $("dev-data").value,
    descricao: $("dev-descricao").value.trim()
  };
  if (!dados.nome || isNaN(dados.valorTotal)) {
    $("dev-erro").textContent = "Preencha o nome e o valor.";
    return;
  }
  try {
    if (modoEdicaoId) {
      await updateDoc(doc(db, "lojas", uidAtual, "devedores", modoEdicaoId), dados);
    } else {
      await addDoc(collection(db, "lojas", uidAtual, "devedores"), {
        ...dados, pagamentos: [], criadoEm: serverTimestamp()
      });
    }
    $("modal-devedor").classList.add("hidden");
    toast("Guardado.");
  } catch (err) {
    $("dev-erro").textContent = "Não foi possível guardar. Tente novamente.";
  }
});

/* =========================================================
   DETALHE DO DEVEDOR + PAGAMENTOS
========================================================= */

function abrirDetalhe(id) {
  devedorAbertoId = id;
  renderDetalhe(id);
  mostrarTela("screen-detalhe");
}

function renderDetalhe(id) {
  const d = devedores.find((x) => x.id === id);
  if (!d) return;
  const saldo = saldoDevedor(d);
  $("detalhe-nome").textContent = d.nome;
  $("detalhe-telefone").textContent = d.telefone || "sem número registado";
  $("detalhe-saldo").textContent = fmtMZN(saldo);
  $("detalhe-saldo").classList.toggle("saldo-valor--deve", saldo > 0);

  const hist = $("detalhe-historico");
  const pagamentos = d.pagamentos || [];
  if (pagamentos.length === 0) {
    hist.innerHTML = `<p class="historico-vazio">Ainda sem pagamentos registados.</p>`;
  } else {
    hist.innerHTML = [...pagamentos].reverse().map((p) => `
      <div class="historico-item">
        <span>${formatarData(p.data)}</span>
        <span class="historico-item__valor">+ ${fmtMZN(p.valor)}</span>
      </div>`).join("");
  }
}

$("form-pagamento").addEventListener("submit", async (e) => {
  e.preventDefault();
  const valor = parseFloat($("pag-valor").value);
  if (isNaN(valor) || valor <= 0) return;
  const d = devedores.find((x) => x.id === devedorAbertoId);
  const novosPagamentos = [...(d.pagamentos || []), { valor, data: hoje() }];
  await updateDoc(doc(db, "lojas", uidAtual, "devedores", devedorAbertoId), { pagamentos: novosPagamentos });
  $("pag-valor").value = "";
  toast("Pagamento registado.");
});

$("btn-apagar-devedor").addEventListener("click", async () => {
  if (!confirm("Apagar este devedor e todo o histórico? Esta ação não pode ser desfeita.")) return;
  await deleteDoc(doc(db, "lojas", uidAtual, "devedores", devedorAbertoId));
  mostrarTela("screen-app");
});

/* =========================================================
   LEMBRETE WHATSAPP
   (abre o WhatsApp com a mensagem pronta — o envio final é
   sempre um toque seu, pois o WhatsApp não permite disparo
   automático sem a API oficial paga da Meta)
========================================================= */

$("btn-lembrete-whatsapp").addEventListener("click", () => {
  const d = devedores.find((x) => x.id === devedorAbertoId);
  if (!d) return;
  if (!d.telefone) {
    toast("Este devedor não tem número de WhatsApp registado.");
    return;
  }
  const saldo = saldoDevedor(d);
  const nomeLoja = lojaAtual.nomeLoja || "a loja";
  const msg = `Olá ${d.nome}! Aqui é ${nomeLoja}. Passando para lembrar que tem ${fmtMZN(saldo)} em aberto${d.descricao ? " (" + d.descricao + ")" : ""}. Quando puder, regularize. Obrigado! 🙏`;
  const numero = d.telefone.replace(/\D/g, "");
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, "_blank");
});

/* =========================================================
   ASSINATURA
========================================================= */

function diasRestantes(validoAteISO) {
  const ms = new Date(validoAteISO).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function atualizarBannerAssinatura() {
  const banner = $("banner-trial");
  const a = lojaAtual.assinatura || {};
  const dias = a.validoAte ? diasRestantes(a.validoAte) : 0;

  if (a.status === "trial" && dias >= 0) {
    banner.textContent = `Período grátis: faltam ${dias} dia(s). Depois, a assinatura custa ${PRECO_MENSAL} MZN/mês.`;
    banner.classList.remove("hidden");
  } else if (dias < 0) {
    banner.textContent = `A sua assinatura expirou. Toque em ⋮ Menu > A minha assinatura para renovar.`;
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
}

function renderAssinatura() {
  const a = lojaAtual.assinatura || {};
  const dias = a.validoAte ? diasRestantes(a.validoAte) : null;
  const card = $("assinatura-status-card");
  const texto = $("assinatura-status-texto");

  card.classList.remove("saldo-valor--deve");
  if (a.status === "trial" && dias >= 0) {
    texto.textContent = `Período de teste — ${dias} dia(s) restante(s)`;
    texto.style.color = "var(--brass)";
  } else if (a.status === "ativo" && dias >= 0) {
    texto.textContent = `Ativa até ${formatarData(a.validoAte.slice(0, 10))}`;
    texto.style.color = "var(--paid-green)";
  } else if (a.status === "pendente") {
    texto.textContent = "Comprovativo em análise";
    texto.style.color = "var(--brass)";
  } else {
    texto.textContent = "Expirada — renove para continuar a usar";
    texto.style.color = "var(--debt-red)";
  }
}

function escutarComprovativos() {
  const col = query(collection(db, "lojas", uidAtual, "comprovativos"), orderBy("enviadoEm", "desc"));
  unsubComprovativos = onSnapshot(col, (snap) => {
    const lista = $("lista-comprovativos");
    if (snap.empty) {
      lista.innerHTML = `<p class="historico-vazio">Ainda não enviou nenhum comprovativo.</p>`;
      return;
    }
    lista.innerHTML = snap.docs.map((docSnap) => {
      const c = docSnap.data();
      const cor = c.status === "aprovado" ? "var(--paid-green)" : c.status === "rejeitado" ? "var(--debt-red)" : "var(--brass)";
      const rotulo = c.status === "aprovado" ? "Aprovado" : c.status === "rejeitado" ? "Rejeitado" : "Pendente";
      return `<div class="historico-item">
        <span>${fmtMZN(c.valor)} · ref. ${escapeHtml(c.referencia)}</span>
        <span style="color:${cor}; font-weight:600;">${rotulo}</span>
      </div>`;
    }).join("");
  });
}

$("form-comprovativo").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("comp-erro").textContent = "";
  const valor = parseFloat($("comp-valor").value);
  const referencia = $("comp-referencia").value.trim();
  const arquivo = $("comp-imagem").files[0];
  if (!valor || !referencia || !arquivo) {
    $("comp-erro").textContent = "Preencha todos os campos e escolha a foto.";
    return;
  }
  const btn = $("btn-enviar-comprovativo");
  btn.disabled = true;
  btn.textContent = "A enviar…";
  try {
    const caminho = `comprovativos/${uidAtual}/${Date.now()}_${arquivo.name}`;
    const storageRef = ref(storage, caminho);
    await uploadBytes(storageRef, arquivo);
    const urlImagem = await getDownloadURL(storageRef);

    await addDoc(collection(db, "lojas", uidAtual, "comprovativos"), {
      valor, referencia, urlImagem, status: "pendente", enviadoEm: serverTimestamp()
    });
    await updateDoc(doc(db, "lojas", uidAtual), { "assinatura.status": "pendente" });
    lojaAtual.assinatura = { ...(lojaAtual.assinatura || {}), status: "pendente" };

    $("form-comprovativo").reset();
    $("comp-valor").value = PRECO_MENSAL;
    toast("Comprovativo enviado. Aguarde a aprovação.");
    renderAssinatura();
  } catch (err) {
    $("comp-erro").textContent = "Não foi possível enviar. Verifique a ligação à internet.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Enviar comprovativo";
  }
});

/* =========================================================
   UTILITÁRIOS
========================================================= */

function formatarData(iso) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* Regista o service worker (funcionamento como PWA) */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
