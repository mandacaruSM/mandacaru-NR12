// Menu Toggle para mobile
const menuToggle = document.getElementById('menuToggle');
const nav = document.querySelector('.nav');

menuToggle.addEventListener('click', () => {
    nav.classList.toggle('active');
});

// Fechar menu ao clicar em um link
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        nav.classList.remove('active');
    });
});

// Scroll suave ao clicar nos links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Formulário de contato
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        telefone: document.getElementById('telefone').value,
        mensagem: document.getElementById('mensagem').value
    };

    // Criar mensagem para WhatsApp
    const whatsappMessage = `*Nova mensagem do site*%0A%0A*Nome:* ${formData.nome}%0A*Email:* ${formData.email}%0A*Telefone:* ${formData.telefone}%0A*Mensagem:* ${formData.mensagem}`;

    // Abrir WhatsApp
    window.open(`https://wa.me/5533999273648?text=${whatsappMessage}`, '_blank');

    // Limpar formulário
    contactForm.reset();

    // Mensagem de sucesso
    alert('Mensagem enviada! Você será redirecionado para o WhatsApp.');
});

// Animação ao scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Aplicar animação aos cards de serviço
document.querySelectorAll('.servico-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'all 0.6s ease-out';
    observer.observe(card);
});

// Header transparente ao topo
const header = document.querySelector('.header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll <= 0) {
        header.classList.remove('scroll-up');
    }

    if (currentScroll > lastScroll && currentScroll > 100) {
        // Scroll para baixo
        header.style.transform = 'translateY(-100%)';
    } else {
        // Scroll para cima
        header.style.transform = 'translateY(0)';
    }

    lastScroll = currentScroll;
});

// Adicionar transição ao header
header.style.transition = 'transform 0.3s ease';

// Contador animado para estatísticas
const animateCounter = (element, target, duration = 2000) => {
    let current = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target + '+';
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current) + '+';
        }
    }, 16);
};

// Observar estatísticas para animação
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
            const numbers = entry.target.querySelectorAll('.stat-number');
            numbers.forEach((number, index) => {
                const targets = [100, 500, 5]; // Valores das estatísticas
                setTimeout(() => {
                    const target = targets[index];
                    animateCounter(number, target);
                }, index * 200);
            });
            entry.target.classList.add('animated');
        }
    });
}, { threshold: 0.5 });

const statsSection = document.querySelector('.stats');
if (statsSection) {
    statsObserver.observe(statsSection);
}

// Validação de telefone brasileiro
const telefoneInput = document.getElementById('telefone');
telefoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length <= 11) {
        if (value.length <= 2) {
            e.target.value = value;
        } else if (value.length <= 6) {
            e.target.value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        } else if (value.length <= 10) {
            e.target.value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
        } else {
            e.target.value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
        }
    }
});

console.log('🌵 Mandacaru Website - Desenvolvido com ❤️');
