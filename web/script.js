// ============================================================
// Mandacaru ERP — Landing Page Scripts
// ============================================================

// Menu Toggle mobile
const menuToggle = document.getElementById('menuToggle');
const nav = document.querySelector('.nav');

menuToggle.addEventListener('click', () => {
    nav.classList.toggle('active');
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        nav.classList.remove('active');
    });
});

// Header shadow no scroll
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Scroll suave para âncoras internas
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            const offset = 80;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    });
});

// Formulário de contato → abre WhatsApp com dados
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const nome     = document.getElementById('nome').value.trim();
    const email    = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const empresa  = document.getElementById('empresa').value.trim();
    const mensagem = document.getElementById('mensagem').value.trim();

    const texto = [
        '*Nova mensagem do site Mandacaru ERP*',
        '',
        `*Nome:* ${nome}`,
        email    ? `*E-mail:* ${email}`    : null,
        telefone ? `*Telefone:* ${telefone}` : null,
        empresa  ? `*Empresa:* ${empresa}`  : null,
        '',
        `*Mensagem:* ${mensagem}`,
    ].filter(l => l !== null).join('%0A');

    window.open(`https://wa.me/5533999273648?text=${texto}`, '_blank');
    contactForm.reset();
});

// Máscara de telefone
const telefoneInput = document.getElementById('telefone');
if (telefoneInput) {
    telefoneInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 11);
        if (v.length <= 2) {
            e.target.value = v;
        } else if (v.length <= 6) {
            e.target.value = `(${v.slice(0,2)}) ${v.slice(2)}`;
        } else if (v.length <= 10) {
            e.target.value = `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
        } else {
            e.target.value = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7,11)}`;
        }
    });
}

// Animação de entrada nos cards via IntersectionObserver
const animItems = document.querySelectorAll('.pilar-card, .diferencial-item, .autoridade-card-pequeno');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

animItems.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s`;
    observer.observe(el);
});

console.log('🌵 Mandacaru ERP — mandacaru.com.br');
