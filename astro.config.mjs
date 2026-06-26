// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Manual de Usuario',
			customCss: [
				'./src/styles/custom.css',
			],
			head: [
				{
					tag: 'script',
					content: `
						document.addEventListener('click', (e) => {
							if (e.target.tagName === 'IMG' && e.target.closest('.sl-markdown-content')) {
								e.preventDefault();
								
								let lightbox = document.getElementById('manual-lightbox');
								if (!lightbox) {
									lightbox = document.createElement('div');
									lightbox.id = 'manual-lightbox';
									
									const closeBtn = document.createElement('button');
									closeBtn.id = 'manual-lightbox-close';
									closeBtn.innerHTML = '&times;';
									lightbox.appendChild(closeBtn);
									
									const img = document.createElement('img');
									lightbox.appendChild(img);
									
									const caption = document.createElement('div');
									caption.id = 'manual-lightbox-caption';
									lightbox.appendChild(caption);
									
									document.body.appendChild(lightbox);
									
									const closeLightbox = () => {
										lightbox.classList.remove('active');
										document.body.style.overflow = '';
									};
									
									lightbox.addEventListener('click', (ev) => {
										if (ev.target === lightbox || ev.target === closeBtn || ev.target === img) {
											closeLightbox();
										}
									});
									
									document.addEventListener('keydown', (ev) => {
										if (ev.key === 'Escape' && lightbox.classList.contains('active')) {
											closeLightbox();
										}
									});
								}
								
								const lightboxImg = lightbox.querySelector('img');
								const lightboxCaption = lightbox.querySelector('#manual-lightbox-caption');
								
								lightboxImg.src = e.target.src;
								
								let altText = e.target.alt || e.target.title || '';
								if (!altText) {
									let next = e.target.nextElementSibling;
									if (next && next.tagName === 'P') {
										altText = next.textContent;
									}
								}
								lightboxCaption.textContent = altText;
								
								lightbox.classList.add('active');
								document.body.style.overflow = 'hidden';
							}
						});
					`,
				},
			],
			sidebar: [
				{
					label: 'Índice del Manual',
					items: [
						{ autogenerate: { directory: 'manual' } },
					],
				},
			],
		}),
	],
});
