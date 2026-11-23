import React, { useMemo, useState } from 'react';
import {
  Calendar,
  MapPin,
  Newspaper,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { EtatVide } from '../../composants/interface/EtatVide';
import { ModaleConfirmationAction } from '../../composants/interface/ModaleConfirmationAction';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { utiliserErp } from '../../contexte/ContexteErp';
import { ArticleActualite } from '../../modeles/erp';

const CATEGORIES_ACTUALITES: Array<'Toutes' | ArticleActualite['categorie']> = [
  'Toutes',
  'Événement',
  'Académique',
  'Vie du campus',
  'Urgent',
];

const STYLES_CATEGORIES: Record<ArticleActualite['categorie'], string> = {
  Événement:
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900',
  Académique:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
  'Vie du campus':
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900',
  Urgent:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900',
};

export const VueActualites: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    actualites_etablissement,
    ajouter_article_actualite,
    modifier_article_actualite,
    basculer_epingle_actualite,
    supprimer_article_actualite,
    a_permission,
  } = utiliserErp();

  const theme_etab = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const peut_gerer = a_permission('actualites:gerer');

  const [filtre_categorie, definir_filtre_categorie] = useState<
    'Toutes' | ArticleActualite['categorie']
  >('Toutes');
  const [recherche, definir_recherche] = useState('');
  const [afficher_editeur, definir_afficher_editeur] = useState(false);
  const [id_edition, definir_id_edition] = useState<string | null>(null);
  const [cible_suppression, definir_cible_suppression] = useState<ArticleActualite | null>(null);

  const [titre, definir_titre] = useState('');
  const [categorie, definir_categorie] = useState<ArticleActualite['categorie']>('Événement');
  const [audience, definir_audience] = useState<ArticleActualite['audience']>('Tous');
  const [date_evenement, definir_date_evenement] = useState('');
  const [lieu, definir_lieu] = useState('');
  const [resume, definir_resume] = useState('');
  const [contenu, definir_contenu] = useState('');
  const [epingle, definir_epingle] = useState(false);

  const reinitialiser_editeur = () => {
    definir_id_edition(null);
    definir_titre('');
    definir_categorie('Événement');
    definir_audience('Tous');
    definir_date_evenement('');
    definir_lieu('');
    definir_resume('');
    definir_contenu('');
    definir_epingle(false);
    definir_afficher_editeur(false);
  };

  const ouvrir_edition_article = (article: ArticleActualite) => {
    definir_id_edition(article.id);
    definir_titre(article.titre);
    definir_categorie(article.categorie);
    definir_audience(article.audience);
    definir_date_evenement(article.date_evenement ?? '');
    definir_lieu(article.lieu ?? '');
    definir_resume(article.resume);
    definir_contenu(article.contenu);
    definir_epingle(article.epingle);
    definir_afficher_editeur(true);
  };

  const articles_filtres = useMemo(() => {
    const requete = recherche.trim().toLowerCase();
    return [...actualites_etablissement]
      .filter((article) => filtre_categorie === 'Toutes' || article.categorie === filtre_categorie)
      .filter(
        (article) =>
          !requete ||
          article.titre.toLowerCase().includes(requete) ||
          article.resume.toLowerCase().includes(requete) ||
          article.contenu.toLowerCase().includes(requete)
      )
      .sort((a, b) => {
        if (a.epingle !== b.epingle) return a.epingle ? -1 : 1;
        return b.publie_le.localeCompare(a.publie_le);
      });
  }, [actualites_etablissement, filtre_categorie, recherche]);

  const gerer_publication = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!titre.trim() || !resume.trim() || !contenu.trim()) return;
    const donnees = {
      titre: titre.trim(),
      categorie,
      audience,
      date_evenement: date_evenement.trim() || undefined,
      lieu: lieu.trim() || undefined,
      resume: resume.trim(),
      contenu: contenu.trim(),
      epingle,
    };
    if (id_edition) {
      modifier_article_actualite(id_edition, donnees);
    } else {
      ajouter_article_actualite(donnees);
    }
    reinitialiser_editeur();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Actualités, Événements & Vie du Campus
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Fil éditorial officiel de {etablissement_actif.nom} : notes circulaires, journées portes
            ouvertes et calendrier des événements.
          </p>
        </div>

        {peut_gerer && (
          <Bouton
            variante="principal"
            taille="sm"
            classe_accent={theme_etab.bouton_principal}
            onClick={() => {
              if (afficher_editeur) {
                reinitialiser_editeur();
              } else {
                reinitialiser_editeur();
                definir_afficher_editeur(true);
              }
            }}
          >
            <Plus className="w-4 h-4" />
            <span>{afficher_editeur ? 'Fermer l’éditeur' : 'Publier une actualité'}</span>
          </Bouton>
        )}
      </div>

      {/* Formulaire de publication */}
      {peut_gerer && afficher_editeur && (
        <Carte className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Newspaper className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-display font-bold">
              {id_edition ? 'Modifier la publication' : 'Nouvelle publication campus'}
            </h3>
          </div>

          <form onSubmit={gerer_publication} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Titre de l’actualité *</label>
              <input
                type="text"
                required
                value={titre}
                onChange={(e) => definir_titre(e.target.value)}
                placeholder="Ex: Cérémonie de remise des diplômes — Promotion 2026"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Catégorie</label>
              <select
                value={categorie}
                onChange={(e) => definir_categorie(e.target.value as ArticleActualite['categorie'])}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Événement">Événement</option>
                <option value="Académique">Académique</option>
                <option value="Vie du campus">Vie du campus</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Public cible</label>
              <select
                value={audience}
                onChange={(e) => definir_audience(e.target.value as ArticleActualite['audience'])}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Tous">Tous</option>
                {terminologie.etape_tuteurs_active && (
                  <option value="Parents">Parents / Tuteurs</option>
                )}
                <option value="Apprenants">{terminologie.apprenant_pluriel}</option>
                <option value="Personnel">Personnel & {terminologie.enseignant_pluriel}</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Date de l’événement (optionnel)</label>
              <input
                type="date"
                value={date_evenement}
                onChange={(e) => definir_date_evenement(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Lieu / Salle (optionnel)</label>
              <input
                type="text"
                value={lieu}
                onChange={(e) => definir_lieu(e.target.value)}
                placeholder="Ex: Amphithéâtre principal"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Résumé court *</label>
              <input
                type="text"
                required
                value={resume}
                onChange={(e) => definir_resume(e.target.value)}
                placeholder="Accroche affichée dans le fil d’actualité..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Contenu détaillé *</label>
              <textarea
                rows={4}
                required
                value={contenu}
                onChange={(e) => definir_contenu(e.target.value)}
                placeholder="Détails pratiques, horaires, consignes..."
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={epingle}
                  onChange={(e) => definir_epingle(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Épingler en haut du fil d’actualité</span>
              </label>

              <div className="flex gap-2">
                <Bouton
                  type="button"
                  variante="secondaire"
                  taille="sm"
                  onClick={reinitialiser_editeur}
                >
                  Annuler
                </Bouton>
                <Bouton
                  type="submit"
                  variante="principal"
                  taille="sm"
                  classe_accent={theme_etab.bouton_principal}
                >
                  {id_edition ? 'Enregistrer les modifications' : 'Publier maintenant'}
                </Bouton>
              </div>
            </div>
          </form>
        </Carte>
      )}

      {/* Filtres & recherche */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES_ACTUALITES.map((cat) => {
            const actif = filtre_categorie === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => definir_filtre_categorie(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  actif
                    ? theme_etab.nav_active
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={recherche}
            onChange={(e) => definir_recherche(e.target.value)}
            placeholder="Rechercher un article ou événement..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      {/* Grille des articles */}
      {articles_filtres.length === 0 ? (
        <EtatVide
          icone={<Newspaper className="w-5 h-5" />}
          titre="Aucune actualité correspondante"
          description="Aucune publication ne correspond à votre filtre actuel dans cet établissement."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {articles_filtres.map((article) => (
            <Carte key={article.id} className="flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                        STYLES_CATEGORIES[article.categorie]
                      }`}
                    >
                      {article.categorie}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                      <Users className="w-3 h-3" />
                      {article.audience}
                    </span>
                    {article.epingle && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900">
                        <Pin className="w-3 h-3" />
                        Épinglé
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-[11px] text-slate-400 shrink-0">
                    {article.publie_le}
                  </span>
                </div>

                <h3 className="text-base font-display font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {article.titre}
                </h3>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {article.resume}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {article.contenu}
                </p>

                {(article.date_evenement || article.lieu) && (
                  <div className="flex flex-wrap gap-3 pt-1 text-xs text-slate-600 dark:text-slate-300">
                    {article.date_evenement && (
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Date : {article.date_evenement}
                      </span>
                    )}
                    {article.lieu && (
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {article.lieu}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>Publié par {article.nom_auteur}</span>
                {peut_gerer && (
                  <div className="flex items-center gap-1.5">
                    <Bouton
                      variante="fantome"
                      taille="sm"
                      onClick={() => basculer_epingle_actualite(article.id)}
                    >
                      <Pin className="w-3.5 h-3.5" />
                      <span>{article.epingle ? 'Désépingler' : 'Épingler'}</span>
                    </Bouton>
                    <Bouton
                      variante="fantome"
                      taille="sm"
                      title="Modifier l’actualité"
                      onClick={() => ouvrir_edition_article(article)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Bouton>
                    <Bouton
                      variante="fantome"
                      taille="sm"
                      title="Supprimer l’actualité"
                      onClick={() => definir_cible_suppression(article)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Bouton>
                  </div>
                )}
              </div>
            </Carte>
          ))}
        </div>
      )}

      <ModaleConfirmationAction
        ouverte={Boolean(cible_suppression)}
        sur_fermeture={() => definir_cible_suppression(null)}
        sur_confirmation={() => {
          if (cible_suppression) supprimer_article_actualite(cible_suppression.id);
        }}
        tonalite="danger"
        titre="Supprimer cette publication ?"
        sous_titre={cible_suppression?.categorie}
        description={`L’actualité « ${cible_suppression?.titre ?? ''} » sera définitivement retirée du portail de l’établissement.`}
        elements_impact={
          cible_suppression
            ? [
                { libelle: 'Titre', valeur: cible_suppression.titre },
                { libelle: 'Public ciblé', valeur: cible_suppression.audience },
                { libelle: 'Publiée le', valeur: cible_suppression.publie_le },
              ]
            : undefined
        }
        note_irreversible="Cette suppression est définitive et ne pourra pas être annulée."
        libelle_confirmation="Supprimer l’actualité"
      />
    </div>
  );
};
