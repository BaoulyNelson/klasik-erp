from datetime import datetime, timezone
import os
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    dossier_sauvegardes = Path(
        os.environ.get(
            "KLASIK_BACKUP_DIR",
            str(Path.home() / "klasik-erp-backups"),
        )
    ).expanduser()
    dossier_sauvegardes.mkdir(parents=True, exist_ok=True)
    horodatage = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    fichier_sauvegarde = dossier_sauvegardes / f"klasik-{horodatage}.dump"
    commande = [
        "docker",
        "compose",
        "exec",
        "-T",
        "db",
        "sh",
        "-c",
        'pg_dump --format=custom --no-owner --no-acl --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"',
    ]

    fichier_cree = False
    try:
        with fichier_sauvegarde.open("xb") as sortie:
            fichier_cree = True
            resultat = subprocess.run(commande, cwd=ROOT, stdout=sortie, check=False)
    except OSError as erreur:
        if fichier_cree:
            fichier_sauvegarde.unlink(missing_ok=True)
        print(f"Impossible de créer la sauvegarde PostgreSQL : {erreur}", file=sys.stderr)
        return 1

    if resultat.returncode != 0:
        fichier_sauvegarde.unlink(missing_ok=True)
        print("La commande pg_dump a échoué; aucune sauvegarde n’a été conservée.", file=sys.stderr)
        return resultat.returncode

    print(f"Sauvegarde PostgreSQL créée : {fichier_sauvegarde}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
