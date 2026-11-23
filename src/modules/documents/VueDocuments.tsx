import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileCheck2, FileText, Printer, Search } from 'lucide-react';
import { Bouton } from '../../composants/interface/Bouton';
import { Carte } from '../../composants/interface/Carte';
import { CodeQrSvg } from '../../composants/interface/CodeQrSvg';
import {
  declencher_impression_ciblee,
  FicheInscriptionImprimable,
} from '../../composants/interface/FicheInscriptionImprimable';
import { LogoEtablissement } from '../../composants/interface/LogoEtablissement';
import { Modale } from '../../composants/interface/Modale';
import { obtenir_theme_etablissement } from '../../composants/interface/theme_etablissement';
import { utiliserErp } from '../../contexte/ContexteErp';
import { DocumentOfficielEmis } from '../../modeles/erp';
import { formater_date_fr, formater_montant } from '../../services/service_donnees';
import { convertir_note_internationale } from '../../utilitaires/notation';

export const VueDocuments: React.FC = () => {
  const {
    etablissement_actif,
    terminologie,
    devise_active,
    utilisateur_actif,
    id_role_actif,
    apprenants_etablissement,
    unites_etablissement,
    documents_etablissement,
    emettre_document_officiel,
    a_permission,
  } = utiliserErp();

  const theme_etab = obtenir_theme_etablissement(etablissement_actif.type, etablissement_actif.couleur_accent);
  const est_profil_personnel = id_role_actif === 'APPRENANT' || id_role_actif === 'PARENT';
  const peut_emettre = a_permission('documents:emettre');

  const apprenants_visibles = useMemo(() => {
    if (!est_profil_personnel) return apprenants_etablissement;
    if (utilisateur_actif.ids_apprenants_lies && utilisateur_actif.ids_apprenants_lies.length > 0) {
      const lies = apprenants_etablissement.filter((a) =>
        utilisateur_actif.ids_apprenants_lies?.includes(a.id)
      );
      if (lies.length > 0) return lies;
    }
    const par_courriel = apprenants_etablissement.filter(
      (a) => (a.courriel ?? '').toLowerCase() === utilisateur_actif.courriel.toLowerCase()
    );
    if (par_courriel.length > 0) return par_courriel;
    return apprenants_etablissement.slice(0, 1);
  }, [
    est_profil_personnel,
    apprenants_etablissement,
    utilisateur_actif.ids_apprenants_lies,
    utilisateur_actif.courriel,
  ]);

  const ids_apprenants_visibles = useMemo(
    () => new Set(apprenants_visibles.map((a) => a.id)),
    [apprenants_visibles]
  );

  const documents_visibles = useMemo(() => {
    if (!est_profil_personnel) return documents_etablissement;
    return documents_etablissement.filter((d) => ids_apprenants_visibles.has(d.id_apprenant));
  }, [est_profil_personnel, documents_etablissement, ids_apprenants_visibles]);

  const [id_apprenant, definir_id_apprenant] = useState(apprenants_visibles[0]?.id ?? '');
  const [type_document, definir_type_document] = useState(
    terminologie.documents_officiels[0] ?? 'Attestation'
  );
  const [apercu_document, definir_apercu_document] = useState<DocumentOfficielEmis | null>(null);
  const [format_impression_doc, definir_format_impression_doc] = useState<'a4' | '80mm'>('a4');
  const [fiche_vierge_ouverte, definir_fiche_vierge_ouverte] = useState(false);
  const [format_fiche_vierge, definir_format_fiche_vierge] = useState<'a4' | '80mm'>('a4');
  const [code_verification, definir_code_verification] = useState('');

  useEffect(() => {
    if (apercu_document && !documents_visibles.some((d) => d.id === apercu_document.id)) {
      definir_apercu_document(null);
    }
  }, [apercu_document, documents_visibles]);

  useEffect(() => {
    definir_type_document(terminologie.documents_officiels[0] ?? 'Attestation');
    definir_id_apprenant(apprenants_visibles[0]?.id ?? '');
  }, [etablissement_actif.id, etablissement_actif.type, terminologie.documents_officiels, apprenants_visibles]);

  const apprenant_selectionne =
    apprenants_visibles.find((a) => a.id === id_apprenant) ?? apprenants_visibles[0];
  const solde = apprenant_selectionne
    ? Math.max(0, apprenant_selectionne.total_du_htg - apprenant_selectionne.total_paye_htg)
    : 0;
  const bloque_par_solde = etablissement_actif.bloquer_documents_si_impaye && solde > 0;

  const document_verifie = code_verification.trim()
    ? documents_visibles.find(
        (doc) =>
          doc.empreinte_verification.toLowerCase() === code_verification.trim().toLowerCase() ||
          doc.numero_document.toLowerCase() === code_verification.trim().toLowerCase()
      )
    : null;

  const gerer_emission = () => {
    if (!apprenant_selectionne || bloque_par_solde || !peut_emettre) return;
    const doc = emettre_document_officiel(apprenant_selectionne.id, type_document);
    if (doc) definir_apercu_document(doc);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
            Documents officiels, Modèles & Vérification QR
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Génération sécurisée avec sceau ({etablissement_actif.code_sceau}), signature et contrôle
            de solde.
          </p>
        </div>

        {!est_profil_personnel && (
          <Bouton
            variante="secondaire"
            taille="sm"
            onClick={() => {
              definir_format_fiche_vierge('a4');
              definir_fiche_vierge_ouverte(true);
            }}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Modèle Fiche Inscription Vierge (A4)</span>
          </Bouton>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Émetteur (personnel autorisé) ou Vérificateur d'authenticité */}
        <Carte className="lg:col-span-5 space-y-4">
          {peut_emettre ? (
            <>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <FileText className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-display font-bold">Émettre un document officiel</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">
                    {terminologie.apprenant_singulier}
                  </label>
                  <select
                    value={apprenant_selectionne?.id ?? ''}
                    onChange={(e) => definir_id_apprenant(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {apprenants_visibles.map((apprenant) => (
                      <option key={apprenant.id} value={apprenant.id}>
                        {apprenant.matricule} · {apprenant.prenom} {apprenant.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    Modèle de document ({terminologie.badge_type_libelle})
                  </label>
                  <select
                    value={type_document}
                    onChange={(e) => definir_type_document(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {terminologie.documents_officiels.map((doc) => (
                      <option key={doc} value={doc}>
                        {doc}
                      </option>
                    ))}
                  </select>
                </div>

                {bloque_par_solde && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-3 text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Blocage actif : solde impayé de{' '}
                      <strong className="font-mono">
                        {formater_montant(
                          solde,
                          devise_active,
                          etablissement_actif.taux_change_usd
                        )}
                      </strong>
                      . Régularisez à l’économat avant délivrance.
                    </span>
                  </div>
                )}

                <Bouton
                  variante="principal"
                  taille="sm"
                  classe_accent={theme_etab.bouton_principal}
                  disabled={bloque_par_solde || !apprenant_selectionne}
                  onClick={gerer_emission}
                  className="w-full"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Générer et prévisualiser (PDF / QR)</span>
                </Bouton>
              </div>
            </>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <FileText className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-display font-bold">
                  Mes documents officiels (Lecture seule)
                </h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Seul le secrétariat ou la direction peut émettre de nouveaux certificats officiels.
                Consultez ci-contre vos documents délivrés et vérifiez leur code QR.
              </p>
            </div>
          )}

          {/* Vérificateur d'authenticité */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <div className="font-semibold">Vérifier l’authenticité d’un document</div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={code_verification}
                onChange={(e) => definir_code_verification(e.target.value)}
                placeholder="Saisir le N° ou hash (ex. HT-EPM-98A4F2)"
                className="w-full pl-8 pr-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            {code_verification.trim() && (
              <div className="text-xs pt-1">
                {document_verifie ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Authentique : {document_verifie.type_document} (
                      {document_verifie.numero_document})
                    </span>
                  </span>
                ) : (
                  <span className="text-red-600">
                    Aucun document correspondant dans ce registre.
                  </span>
                )}
              </div>
            )}
          </div>
        </Carte>

        {/* Registre des documents émis */}
        <Carte rembourrage="aucun" className="lg:col-span-7">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-display font-bold">
              {est_profil_personnel
                ? `Mes documents délivrés (${documents_visibles.length})`
                : `Registre des documents émis (${documents_visibles.length})`}
            </h3>
          </div>
          {documents_visibles.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Aucun document officiel délivré pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {documents_visibles.map((doc) => {
                const apprenant = apprenants_etablissement.find((a) => a.id === doc.id_apprenant);
                return (
                  <div key={doc.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {doc.type_document} ·{' '}
                        <span className="font-mono text-slate-500">{doc.numero_document}</span>
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {apprenant
                          ? `${apprenant.prenom} ${apprenant.nom} (${apprenant.matricule})`
                          : doc.id_apprenant}{' '}
                        · {formater_date_fr(doc.emis_le)} · Code QR :{' '}
                        <span className="font-mono">{doc.empreinte_verification}</span>
                      </div>
                    </div>
                    <Bouton
                      variante="secondaire"
                      taille="sm"
                      onClick={() => definir_apercu_document(doc)}
                    >
                      Ouvrir
                    </Bouton>
                  </div>
                );
              })}
            </div>
          )}
        </Carte>
      </div>

      {/* Modale d'aperçu officiel imprimable */}
      <Modale
        ouverte={Boolean(apercu_document)}
        sur_fermeture={() => definir_apercu_document(null)}
        titre={apercu_document?.type_document ?? 'Document officiel'}
        sous_titre={`Numéro : ${apercu_document?.numero_document ?? ''} · ${format_impression_doc === 'a4' ? 'A4 Officiel' : 'Ticket 80mm'}`}
        classe_largeur_max={format_impression_doc === '80mm' ? 'max-w-md' : 'max-w-2xl'}
        pied_page={
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => definir_format_impression_doc('a4')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  format_impression_doc === 'a4'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                A4 Officiel
              </button>
              <button
                type="button"
                onClick={() => definir_format_impression_doc('80mm')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  format_impression_doc === '80mm'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Ticket 80mm
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Bouton variante="fantome" onClick={() => definir_apercu_document(null)}>
                Fermer
              </Bouton>
              <Bouton
                variante="principal"
                classe_accent={theme_etab.bouton_principal}
                onClick={declencher_impression_ciblee}
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer ({format_impression_doc.toUpperCase()})</span>
              </Bouton>
            </div>
          </div>
        }
      >
        {apercu_document &&
          (() => {
            const apprenant = apprenants_etablissement.find(
              (a) => a.id === apercu_document.id_apprenant
            );
            const unite = unites_etablissement.find((u) => u.id === apprenant?.id_unite);
            const equivalence_intl = convertir_note_internationale(
              apprenant?.moyenne_generale ?? 0,
              etablissement_actif.echelle_notation
            );
            return format_impression_doc === '80mm' ? (
              <div className="printable-document-root">
                <div className="ticket-80mm max-w-[330px] mx-auto bg-white border border-slate-300 shadow-sm p-5 font-mono text-[11.5px] text-slate-900 leading-relaxed space-y-3">
                  <div className="text-center border-b border-dashed border-slate-400 pb-3 space-y-1">
                    {etablissement_actif.url_logo && (
                      <div className="flex justify-center pb-1">
                        <img
                          src={etablissement_actif.url_logo}
                          alt={`Logo ${etablissement_actif.nom}`}
                          className="h-9 w-9 object-contain"
                        />
                      </div>
                    )}
                    <div className="font-bold text-sm uppercase">
                      {etablissement_actif.nom_court}
                    </div>
                    <div className="text-[10px] text-slate-600">{etablissement_actif.nom}</div>
                    <div className="text-[10px] text-slate-500">
                      {etablissement_actif.telephone}
                    </div>
                    <div className="pt-1 font-bold uppercase text-xs">
                      {apercu_document.type_document}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {apercu_document.numero_document}
                    </div>
                  </div>
                  <div className="space-y-1 border-b border-dashed border-slate-400 pb-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{terminologie.apprenant_singulier}:</span>
                      <span className="font-bold text-right">
                        {apprenant?.prenom} {apprenant?.nom}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Matricule:</span>
                      <span className="font-bold">{apprenant?.matricule}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{terminologie.unite_singulier}:</span>
                      <span className="text-right">
                        {unite?.nom ?? apprenant?.libelle_niveau}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Moyenne / GPA:</span>
                      <span className="font-bold">
                        {apprenant?.moyenne_generale}/{etablissement_actif.echelle_notation} ·{' '}
                        {equivalence_intl.gpa4.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Émis le:</span>
                      <span>{formater_date_fr(apercu_document.emis_le)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-center gap-1.5 pt-1">
                    <CodeQrSvg
                      valeur={`${apercu_document.numero_document}|${apercu_document.empreinte_verification}`}
                      taille={76}
                    />
                    <div className="text-[10px] text-slate-500">
                      Hash : {apercu_document.empreinte_verification}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Sceau : {etablissement_actif.code_sceau}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="printable-document-root">
                <div className="print-sheet-a4 rounded-xl border-2 border-slate-300 dark:border-slate-700 p-6 bg-white dark:bg-slate-950 space-y-5 text-xs">
                  <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <LogoEtablissement
                        type={etablissement_actif.type}
                        code={etablissement_actif.code}
                        url_logo={etablissement_actif.url_logo}
                        nom={etablissement_actif.nom}
                        taille="grand"
                      />
                      <div>
                        <div className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
                          {etablissement_actif.nom}
                        </div>
                        <div className="text-slate-500">
                          {etablissement_actif.adresse} · {etablissement_actif.nom_pays}
                        </div>
                        <div className="text-slate-500 font-mono">
                          {etablissement_actif.telephone} · Tutelle :{' '}
                          {etablissement_actif.autorite_tutelle}
                        </div>
                      </div>
                    </div>
                    <CodeQrSvg
                      valeur={`${apercu_document.numero_document}|${apercu_document.empreinte_verification}`}
                      taille={72}
                    />
                  </div>

                  <div className="text-center py-2">
                    <div className="font-mono text-[11px] text-slate-500">
                      {apercu_document.numero_document}
                    </div>
                    <h4 className="text-lg font-display font-bold uppercase tracking-wide mt-1">
                      {apercu_document.type_document}
                    </h4>
                  </div>

                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    La Direction de <strong>{etablissement_actif.nom}</strong> certifie que{' '}
                    <strong>
                      {apprenant?.prenom} {apprenant?.nom}
                    </strong>{' '}
                    (Matricule <span className="font-mono font-semibold">{apprenant?.matricule}</span>
                    {apprenant?.nationalite ? `, Nationalité : ${apprenant.nationalite}` : ''}) est
                    régulièrement inscrit(e) au titre de l’année académique{' '}
                    <strong>{etablissement_actif.annee_academique}</strong> dans l’unité{' '}
                    <strong>{unite?.nom ?? apprenant?.libelle_niveau}</strong>, avec une moyenne
                    consolidée de{' '}
                    <strong className="font-mono">
                      {apprenant?.moyenne_generale}/{etablissement_actif.echelle_notation}
                    </strong>{' '}
                    (Équivalence internationale :{' '}
                    <strong className="font-mono">
                      GPA {equivalence_intl.gpa4.toFixed(2)} / 4.00 · Grade {equivalence_intl.lettre}
                    </strong>
                    , {equivalence_intl.mention}) et un taux d’assiduité de{' '}
                    <strong className="font-mono">{apprenant?.taux_assiduite}%</strong>.
                  </p>

                  <div className="pt-6 flex items-end justify-between border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] text-slate-500">
                      <div>
                        Fait à {etablissement_actif.ville.split(',')[0]} (
                        {etablissement_actif.nom_pays}), le{' '}
                        {formater_date_fr(apercu_document.emis_le)}
                      </div>
                      <div className="font-mono mt-1">
                        Vérification : {apercu_document.empreinte_verification}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {etablissement_actif.nom_direction}
                      </div>
                      <div className="text-slate-500">{etablissement_actif.titre_direction}</div>
                      <div className="mt-2 inline-block px-2 py-0.5 border border-slate-300 dark:border-slate-700 font-mono text-[10px] rounded">
                        {etablissement_actif.code_sceau}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
      </Modale>

      {/* Modale Fiche d'Inscription Vierge A4 / 80mm */}
      <Modale
        ouverte={fiche_vierge_ouverte}
        sur_fermeture={() => definir_fiche_vierge_ouverte(false)}
        titre="Modèle de Fiche d’Inscription Vierge"
        sous_titre={`${etablissement_actif.nom_court} · À remplir manuellement ou archiver`}
        classe_largeur_max={format_fiche_vierge === '80mm' ? 'max-w-md' : 'max-w-4xl'}
        pied_page={
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => definir_format_fiche_vierge('a4')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  format_fiche_vierge === 'a4'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                A4 Officiel
              </button>
              <button
                type="button"
                onClick={() => definir_format_fiche_vierge('80mm')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  format_fiche_vierge === '80mm'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Ticket 80mm
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Bouton variante="fantome" onClick={() => definir_fiche_vierge_ouverte(false)}>
                Fermer
              </Bouton>
              <Bouton
                variante="principal"
                classe_accent={theme_etab.bouton_principal}
                onClick={declencher_impression_ciblee}
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer ({format_fiche_vierge.toUpperCase()})</span>
              </Bouton>
            </div>
          </div>
        }
      >
        <FicheInscriptionImprimable
          etablissement={etablissement_actif}
          terminologie={terminologie}
          devise={devise_active}
          format={format_fiche_vierge}
          apprenant={null}
        />
      </Modale>
    </div>
  );
};
