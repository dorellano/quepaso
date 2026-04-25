// =============================================
// EJEMPLOS DE INTEGRACIÓN POR CMS
// =============================================


// ─────────────────────────────────────────────
// 1. WORDPRESS / PHP
// Agregar en functions.php o en un plugin custom
// ─────────────────────────────────────────────

/*
  En el footer de tu tema (footer.php o via wp_footer hook):

  add_action('wp_footer', function() {
    if (!is_user_logged_in()) return;
    $user = wp_get_current_user();
    ?>
    <script type="module">
      import { identifyUser } from '/wp-content/themes/tu-tema/gameEngine.js';
      identifyUser('<?= $user->user_email ?>', '<?= $user->display_name ?>');
    </script>
    <?php
  });

  En el single.php (página de cada nota/post):

  add_action('wp_footer', function() {
    if (!is_single() || !is_user_logged_in()) return;
    $post_id = get_the_ID();
    $post_title = get_the_title();
    ?>
    <script type="module">
      import { initScrollTracker } from '/wp-content/themes/tu-tema/gameEngine.js';

      initScrollTracker(
        '<?= $post_id ?>',
        '<?= esc_js($post_title) ?>',
        (xpGained, streak) => {
          // Mostrar notificación
          const notif = document.createElement('div');
          notif.innerHTML = `¡+${xpGained} XP! Scratch card desbloqueada 🎴`;
          notif.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#000;color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;z-index:9999';
          document.body.appendChild(notif);
          setTimeout(() => notif.remove(), 3000);

          // Mostrar el widget de scratch card
          document.getElementById('scratch-widget').style.display = 'block';
        }
      );
    </script>
    <div id="scratch-widget" style="display:none">
      <!-- Acá va el HTML de la scratch card del gameEngine -->
    </div>
    <?php
  });
*/


// ─────────────────────────────────────────────
// 2. NEXT.JS / REACT
// ─────────────────────────────────────────────

/*
  En tu layout principal (app/layout.tsx o _app.tsx):

  import { useEffect } from 'react';
  import { useSession } from 'next-auth/react'; // o tu sistema de auth
  import { identifyUser } from '@/lib/gameEngine';

  export default function Layout({ children }) {
    const { data: session } = useSession();

    useEffect(() => {
      if (session?.user?.email) {
        identifyUser(session.user.email, session.user.name);
      }
    }, [session]);

    return <>{children}</>;
  }

  En cada página de artículo (app/blog/[slug]/page.tsx):

  'use client';
  import { useEffect, useState } from 'react';
  import { initScrollTracker, useScratchCard } from '@/lib/gameEngine';
  import ScratchCard from '@/components/ScratchCard';

  export default function ArticlePage({ params, post }) {
    const [showScratch, setShowScratch] = useState(false);
    const [prize, setPrize] = useState(null);

    useEffect(() => {
      initScrollTracker(params.slug, post.title, async (xpGained) => {
        setShowScratch(true);
        // Toast de notificación
        toast.success(`¡+${xpGained} XP! Scratch card desbloqueada`);
      });
    }, []);

    const handleScratch = async () => {
      const result = await useScratchCard(params.slug);
      setPrize(result);
    };

    return (
      <article>
        {post.content}
        {showScratch && <ScratchCard onReveal={handleScratch} prize={prize} />}
      </article>
    );
  }
*/


// ─────────────────────────────────────────────
// 3. HTML PURO / CUALQUIER CMS
// ─────────────────────────────────────────────

/*
  Paso 1: En el <head> de todas las páginas:
  <script type="module" src="/gameEngine.js"></script>

  Paso 2: En el footer de todas las páginas (con el email del usuario logueado):
  <script type="module">
    import { identifyUser } from '/gameEngine.js';
    // Reemplazar con cómo tu CMS expone el usuario logueado
    const userEmail = '{{ current_user.email }}';
    const userName  = '{{ current_user.name }}';
    if (userEmail) identifyUser(userEmail, userName);
  </script>

  Paso 3: En cada página de nota/artículo:
  <script type="module">
    import { initScrollTracker, useScratchCard } from '/gameEngine.js';

    initScrollTracker(
      '{{ post.id }}',          // ID único del artículo
      '{{ post.title }}',       // Título
      async (xpGained, streak) => {
        // Mostrar notificación de XP ganado
        showXPNotification(xpGained);

        // Mostrar scratch card
        const scratchModal = document.getElementById('scratch-modal');
        scratchModal.style.display = 'flex';

        // Cuando el usuario raspa:
        document.getElementById('scratch-canvas').addEventListener('scratchComplete', async () => {
          const prize = await useScratchCard('{{ post.id }}');
          showPrizeResult(prize);
        });
      }
    );
  </script>
*/


// ─────────────────────────────────────────────
// 4. GHOST CMS (muy común en blogs)
// ─────────────────────────────────────────────

/*
  En Settings → Code Injection → Site Footer:

  <script type="module">
    import { identifyUser, initScrollTracker } from 'https://tu-proyecto.vercel.app/gameEngine.js';

    // Ghost expone el usuario así si tienen membership activo:
    const ghostUser = window.ghost?.member;
    if (ghostUser) {
      identifyUser(ghostUser.email, ghostUser.name);
    }

    // Si estamos en un post:
    if (document.querySelector('article.gh-article')) {
      const postSlug = window.location.pathname.replace(/\//g, '');
      const postTitle = document.querySelector('h1.gh-article-title')?.textContent || postSlug;

      initScrollTracker(postSlug, postTitle, (xpGained) => {
        const toast = document.createElement('div');
        toast.textContent = `+${xpGained} XP · Rascá tu tarjeta premio`;
        toast.style.cssText = `
          position: fixed; bottom: 24px; right: 24px;
          background: #000; color: #fff;
          padding: 12px 20px; border-radius: 8px;
          font-size: 14px; z-index: 9999; cursor: pointer;
        `;
        toast.onclick = () => { window.location.href = '/mi-perfil#scratch'; };
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
      });
    }
  </script>
*/
