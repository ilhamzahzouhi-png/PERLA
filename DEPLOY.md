# Mettre la veille en ligne gratuitement (GitHub)

Ce guide met l'application en ligne **gratuitement et à vie**, avec :
- un **tableau de bord accessible par un lien** (GitHub Pages) ;
- une **collecte automatique chaque matin** (GitHub Actions) ;
- (étape suivante) l'**email du lundi**.

Aucune ligne de commande n'est nécessaire : on utilise l'application **GitHub Desktop**.

---

## 1. Créer un compte GitHub (2 min)

1. Aller sur https://github.com/signup
2. Renseigner e-mail, mot de passe, nom d'utilisateur → valider l'e-mail.
3. Choisir le plan **Free (gratuit)**.

## 2. Installer GitHub Desktop (5 min)

1. Télécharger : https://desktop.github.com
2. Installer et l'ouvrir, puis **se connecter** avec le compte GitHub créé.

## 3. Publier le dossier de l'application (3 min)

1. Dans GitHub Desktop : menu **File → Add Local Repository**.
2. Choisir le dossier : `/Users/ilhamzahzouhi/Desktop/CLAUD`
3. Un message propose de créer un dépôt (« create a repository ») → cliquer **create a repository**.
   - Name : `veille-immobilier` (ou autre)
   - Cliquer **Create Repository**.
4. Cliquer **Publish repository** (en haut).
   - **Décocher** « Keep this code private » si tu veux que le lien public fonctionne
     (GitHub Pages gratuit nécessite un dépôt **public**).
   - Cliquer **Publish Repository**.

> À chaque modification faite ici, GitHub Desktop affichera les changements :
> tu écris un petit message puis **Commit** → **Push origin** pour les envoyer en ligne.

## 4. Activer le tableau de bord en ligne — GitHub Pages (2 min)

1. Sur https://github.com → ouvrir le dépôt `veille-immobilier`.
2. Onglet **Settings** (en haut à droite).
3. Menu de gauche **Pages**.
4. Section **Build and deployment** → **Source : Deploy from a branch**.
5. **Branch** : choisir `main`, dossier **`/docs`** → **Save**.
6. Patienter 1-2 min : GitHub affiche l'adresse publique, du type :
   `https://TON-NOM.github.io/veille-immobilier/`
   → c'est le lien de ton tableau de bord. 🎉

## 5. Activer la collecte automatique — GitHub Actions (2 min)

1. Toujours dans **Settings** → menu gauche **Actions → General**.
2. Section **Workflow permissions** → cocher **Read and write permissions** → **Save**.
   (Nécessaire pour que la collecte puisse enregistrer les nouveaux articles.)
3. Onglet **Actions** (en haut).
4. Choisir **Collecte quotidienne** à gauche → bouton **Run workflow** → **Run workflow**.
   - Cela lance une première collecte tout de suite (≈ 1 min).
   - Ensuite, elle se relance **automatiquement chaque matin**.

Après la collecte, recharge le lien du tableau de bord : les articles du jour apparaissent.

---

## En résumé

| Élément | Où | Fréquence |
|---|---|---|
| Tableau de bord | `https://TON-NOM.github.io/veille-immobilier/` | en ligne 24/7 |
| Collecte des articles | Onglet **Actions** | chaque matin (05h30 UTC) |
| Email du lundi | *à configurer (étape suivante)* | chaque lundi |

## Modifier l'heure de collecte

Fichier `.github/workflows/collect.yml`, ligne `cron: "30 5 * * *"`
(format `minute heure * * *`, en **UTC** ; le Maroc est à UTC+1).

## Questions fréquentes

- **C'est vraiment gratuit ?** Oui : GitHub Pages + Actions sont gratuits pour un dépôt public
  (largement dans les quotas gratuits pour cet usage).
- **Le lien est-il public ?** Oui, toute personne ayant l'URL peut voir le tableau de bord.
  Pour un accès restreint, il faudra une autre solution (payante) — on pourra en reparler.
