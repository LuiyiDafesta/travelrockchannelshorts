/**
 * TravelRock Channel Shorts - Base de Datos de Videos Local (CMS)
 * 
 * Modifica este archivo para agregar, quitar o actualizar los videos de Backblaze B2.
 * Cada video tiene los siguientes campos:
 *  - id: Identificador único (número o string).
 *  - title: Título del short (atractivo y premium).
 *  - category: Categoría principal ('boliche', 'aventura', 'lifestyle', 'emociones').
 *  - categoryLabel: Etiqueta visible de la categoría.
 *  - school: Colegio/Grupo protagonista del video (para dar pertenencia).
 *  - description: Una pequeña reseña o anécdota divertida en Bariloche.
 *  - videoUrl: Enlace directo al archivo MP4 alojado en Backblaze B2 (o CDN).
 *  - thumbnailUrl: Imagen de miniatura (se muestra antes de reproducir y en el catálogo estilo Netflix).
 *  - likes: Cantidad inicial de likes.
 *  - duration: Duración estimada en segundos.
 *  - date: Fecha del momento.
 */

export const videosData = [
  {
    id: 1,
    title: "¡Explotó By Pass con los chicos de San Martín! 🎧🔥",
    category: "boliche",
    categoryLabel: "Noche de Boliche",
    school: "Inst. San Martín - Buenos Aires",
    description: "La primera noche en Bariloche no se olvida más. Los chicos coparon la pista de By Pass con un show de luces láser y el mejor set del año. ¡Una locura total!",
    videoUrl: "https://player.vimeo.com/external/403816654.sd.mp4?s=d75ebecbbf6ee28a38db66453f7c46f6f9628286&profile_id=165&oauth2_token_id=57447761",
    thumbnailUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=60", // Imagen espectacular de luces de fiesta/DJ
    likes: 1842,
    duration: 15,
    date: "22 May 2026"
  },
  {
    id: 2,
    title: "Snowboard Extremo en el Cerro Catedral 🏂❄️",
    category: "aventura",
    categoryLabel: "Aventura Extrema",
    school: "Colegio Don Bosco - Córdoba",
    description: "Nieve polvo de primera calidad en la cima del Cerro Catedral. Los chicos se animaron al snowboard y nos regalaron estas tomas épicas bajando por las mejores pistas de Bariloche.",
    videoUrl: "https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054ba208d2de0d4e3e3c1f2ad9938ae&profile_id=139&oauth2_token_id=57447761",
    thumbnailUrl: "https://images.unsplash.com/photo-1482867996988-2faec3cbb4f9?w=600&auto=format&fit=crop&q=60", // Imagen espectacular de snowboarder en montaña nevada
    likes: 2450,
    duration: 12,
    date: "21 May 2026"
  },
  {
    id: 3,
    title: "Rafting en el Río Manso: Pura Adrenalina 🌊🛶",
    category: "aventura",
    categoryLabel: "Aventura Extrema",
    school: "Escuela Técnica N°1 - Santa Fe",
    description: "¡Nadie zafó del agua fría! Cruzamos los rápidos más intensos del Río Manso en una jornada cargada de risas, trabajo en equipo y saltos espectaculares. ¡Aventura 100%!",
    videoUrl: "https://player.vimeo.com/external/394676579.sd.mp4?s=2946dcb1987d6092040b2b528e1d5cc586b514b8&profile_id=165&oauth2_token_id=57447761",
    thumbnailUrl: "https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=600&auto=format&fit=crop&q=60", // Imagen espectacular de rafting o agua en movimiento de aventura
    likes: 1598,
    duration: 18,
    date: "20 May 2026"
  },
  {
    id: 4,
    title: "Tarde de Chocolate y Fogón en la Cabaña ☕🔥",
    category: "lifestyle",
    categoryLabel: "Lifestyle & Relax",
    school: "Colegio Nacional - Mendoza",
    description: "Después de un largo día en la nieve, nada mejor que refugiarse en una cabaña rústica frente al lago, disfrutando de los mejores chocolates artesanales y un fogón con anécdotas de viaje.",
    videoUrl: "https://player.vimeo.com/external/517600742.sd.mp4?s=2a2be10c12853246eb3030388d0b2f5b8c9d4b68&profile_id=165&oauth2_token_id=57447761",
    thumbnailUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=60", // Imagen espectacular de chocolate caliente y bombones
    likes: 3120,
    duration: 14,
    date: "19 May 2026"
  },
  {
    id: 5,
    title: "Vuelo de Pájaro sobre los Lagos Patagónicos 🌲🦅",
    category: "emociones",
    categoryLabel: "Momentos Mágicos",
    school: "Todos los Grupos 2026",
    description: "Una postal en movimiento que quedará grabada para siempre en la memoria. Así se ven los bosques milenarios y el lago Nahuel Huapi desde las alturas de Bariloche. El viaje de nuestras vidas.",
    videoUrl: "https://player.vimeo.com/external/384761655.sd.mp4?s=6a9876f2d2508719bc4a8968f44d57c79e602492&profile_id=165&oauth2_token_id=57447761",
    thumbnailUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=60", // Imagen espectacular de montañas de Bariloche y lagos
    likes: 4230,
    duration: 20,
    date: "18 May 2026"
  }
];
