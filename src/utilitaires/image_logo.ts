export function traiter_image_logo(fichier: File, taille_max = 256): Promise<string> {
  return new Promise((resoudre, rejeter) => {
    if (!fichier.type.startsWith('image/')) {
      rejeter(new Error('Format image requis (PNG, JPG, SVG, WebP).'));
      return;
    }
    if (fichier.size > 5 * 1024 * 1024) {
      rejeter(new Error('Le fichier dépasse 5 Mo.'));
      return;
    }

    const lecteur = new FileReader();
    lecteur.onerror = () => rejeter(new Error('Lecture du fichier impossible.'));
    lecteur.onload = () => {
      const resultat = String(lecteur.result);
      if (fichier.type === 'image/svg+xml') {
        resoudre(resultat);
        return;
      }
      const image = new Image();
      image.onerror = () => rejeter(new Error('Image invalide ou corrompue.'));
      image.onload = () => {
        const dimension_max = Math.max(image.width, image.height);
        const echelle = dimension_max > 0 ? Math.min(1, taille_max / dimension_max) : 1;
        const largeur = Math.max(1, Math.round(image.width * echelle));
        const hauteur = Math.max(1, Math.round(image.height * echelle));
        const canevas = document.createElement('canvas');
        canevas.width = largeur;
        canevas.height = hauteur;
        const contexte = canevas.getContext('2d');
        if (!contexte) {
          resoudre(resultat);
          return;
        }
        contexte.drawImage(image, 0, 0, largeur, hauteur);
        resoudre(canevas.toDataURL('image/png'));
      };
      image.src = resultat;
    };
    lecteur.readAsDataURL(fichier);
  });
}
