import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MemberService } from 'src/services/member.service';

@Component({
  selector: 'app-member-form',
  templateUrl: './member-form.component.html',
  styleUrls: ['./member-form.component.css']
})
export class MemberFormComponent implements OnInit {
  form!: FormGroup;
  hidePassword = true; // mot de passe caché par défaut
  isEditMode = false;   // nouveau champ pour savoir si on modifie ou ajoute
  photoFile?: File;
  cvFile?: File;
  photoPreview: string | null = null;
  cvFileName: string | null = null;
  photoProcessing = false;

  // teachers list for encadrant selection
  teachers: any[] = [];

  constructor(
    private MS: MemberService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const idcourant = this.activatedRoute.snapshot.params['id'];
    this.isEditMode = !!idcourant;

    // initialisation du formulaire avant de récupérer les données pour éviter un formulaire null
    this.form = new FormGroup({
      cin: new FormControl(null, Validators.required),
      nom: new FormControl(null, Validators.required),
      prenom: new FormControl(null, Validators.required),
      dateNaissance: new FormControl(null),
      email: new FormControl(null, [Validators.required, Validators.email]),
      password: new FormControl(null, Validators.required),
      type: new FormControl('etudiant', Validators.required),
      photo: new FormControl(null),
      cv: new FormControl(null),
      // student fields
      dateInscription: new FormControl(null),
      diplome: new FormControl(null),
      encadrantId: new FormControl(null),
      // teacher fields
      grade: new FormControl(null),
      etablissement: new FormControl(null)
    });

    // load teachers list for encadrant selection
    this.teachers = [];
    this.loadTeachers();

    // react to changes of type to toggle validators
    this.form.get('type')?.valueChanges.subscribe((type) => {
      this.updateTypeValidators(type);
    });

    // set validators according to initial type value
    this.updateTypeValidators(this.form.get('type')?.value);

    if (this.isEditMode) {
      // MODE EDIT
      this.MS.getMemberById(idcourant).subscribe(a => {
        // patchValue pour remplir le formulaire existant
        // determine encadrant id whether encadrant is primitive id or object
        let encId: number | null = null;
        const enc = (a as any).encadrant;
        if (enc !== undefined && enc !== null) {
          if (typeof enc === 'number') {
            encId = enc;
          } else if (typeof enc === 'string') {
            const parsed = Number(enc);
            encId = isNaN(parsed) ? null : parsed;
          } else if ((enc as any).id) {
            encId = Number((enc as any).id);
          }
        }

        this.form.patchValue({
          cin: a.cin,
          nom: a.nom,
          prenom: a.prenom,
          dateNaissance: a.dateNaissance,
          email: a.email,
          password: a.password,
          type: a.type,
          photo: a.photo,
          cv: a.cv,
          // optional fields
          dateInscription: (a as any).dateInscription || null,
          diplome: (a as any).diplome || null,
          grade: (a as any).grade || null,
          etablissement: (a as any).etablissement || null,
          encadrantId: encId
        });

        // ensure validators match the patched type
        this.updateTypeValidators(a.type);
      });
    }
  }

  private getTodayFormatted(): string {
    return new Date().toISOString().split('T')[0];
  }

  private toIsoDate(value: any): string | null {
    if (!value) return null;
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    // allow already formatted strings
    if (typeof value === 'string') {
      // try to parse then reformat
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return value;
    }
    return null;
  }

  private updateTypeValidators(type: string | null) {
    if (!type) return;
    // student selected -> require dateInscription and diplome
    if (type.toLowerCase() === 'etudiant') {
      this.form.get('dateInscription')?.setValidators(Validators.required);
      this.form.get('diplome')?.setValidators(Validators.required);
      // remove teacher validators
      this.form.get('grade')?.clearValidators();
      this.form.get('etablissement')?.clearValidators();
    } else {
      // teacher selected -> require grade and etablissement
      this.form.get('grade')?.setValidators(Validators.required);
      this.form.get('etablissement')?.setValidators(Validators.required);
      // remove student validators
      this.form.get('dateInscription')?.clearValidators();
      this.form.get('diplome')?.clearValidators();
    }

    // update validity
    ['dateInscription','diplome','grade','etablissement','encadrantId'].forEach(k => {
      this.form.get(k)?.updateValueAndValidity();
    });
  }

  private loadTeachers() {
    this.MS.getAllMembersRaw().subscribe(list => {
      // teachers are members without dateInscription
      this.teachers = (list || []).filter((m: any) => m.dateInscription === undefined || m.dateInscription === null);
    }, err => {
      console.error('loadTeachers error', err);
      this.teachers = [];
    });
  }

  isStudent(): boolean {
    const t = this.form.get('type')?.value;
    return t && String(t).toLowerCase() === 'etudiant';
  }

  isTeacher(): boolean {
    const t = this.form.get('type')?.value;
    return t && String(t).toLowerCase() === 'enseignant';
  }


  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      // clear photo if user cancelled
      this.photoFile = undefined;
      this.photoPreview = null;
      this.form.patchValue({ photo: null });
      return;
    }
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Format image invalide. Formats acceptés: PNG, JPG, JPEG, GIF, WEBP');
      input.value = '';
      return;
    }
    this.photoFile = file;
    const reader = new FileReader();
    this.photoProcessing = true;
    reader.onload = () => {
      // save data URL for preview and base64 payload
      const dataUrl = reader.result as string;
      this.photoPreview = dataUrl;
      // strip prefix 'data:*/*;base64,' and store only base64 content (backend expects bytes)
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      this.form.patchValue({ photo: base64 });
      this.photoProcessing = false;
    };
    reader.onerror = (err) => {
      console.error('Erreur chargement image', err);
      alert('Impossible de lire le fichier image');
      input.value = '';
      this.photoFile = undefined;
      this.photoPreview = null;
      this.form.patchValue({ photo: null });
      this.photoProcessing = false;
    };
    reader.readAsDataURL(file);
  }

  onCvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      this.cvFile = undefined;
      this.cvFileName = null;
      this.form.patchValue({ cv: null });
      return;
    }
    if (file.type !== 'application/pdf') {
      alert('Le CV doit être un fichier PDF.');
      input.value = '';
      return;
    }
    this.cvFile = file;
    this.cvFileName = file.name;
    // sauvegarder le nom de fichier (le backend attend un string pour cv)
    this.form.patchValue({ cv: file.name });
  }

  sub(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched(); // pour afficher les erreurs si invalide
      return;
    }

    const idcourant = this.activatedRoute.snapshot.params['id'];
    const raw = {
      ...this.form.value,
      dateNaissance: this.toIsoDate(this.form.value.dateNaissance),
      dateInscription: this.toIsoDate(this.form.value.dateInscription),
      createdDate: this.getTodayFormatted()
    };

    // map encadrantId to encadrant object as backend expects { id: N } or null
    const encIdVal = raw.encadrantId;
    if (encIdVal !== undefined && encIdVal !== null && encIdVal !== '') {
      raw.encadrant = { id: Number(encIdVal) };
    } else {
      raw.encadrant = null;
    }
    // remove helper field before sending
    delete raw.encadrantId;

    if (this.isEditMode) {
      this.MS.updateMember(idcourant, raw).subscribe(() => {
        this.router.navigate(['/members']);
      });
    } else {
      this.MS.addMember(raw).subscribe(() => {
        this.router.navigate(['/members']);
      });
    }
  }
}
