import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PubService } from 'src/services/pub.service';
import { Pub } from 'src/modeles/Pub';
import { MemberService } from 'src/services/member.service';

@Component({
  selector: 'app-article-create',
  templateUrl: './article-create.component.html',
  styleUrls: ['./article-create.component.css']
})
export class ArticleCreateComponent {
  form!: FormGroup;
  members: any[] = [];

  constructor(
    private dialogRef: MatDialogRef<ArticleCreateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: string | null,
    private pubService: PubService,
    private memberService: MemberService
  ) {
    // load members for selection
    this.memberService.getAllMembersRaw().subscribe(list => {
      this.members = list || [];
    }, err => {
      console.error('Failed to load members', err);
      this.members = [];
    });

    if (data) {
      // Edit: data may be a string id or an object { id, originalMemberIds }
      const editId = typeof data === 'string' ? data : (data && (data as any).id ? (data as any).id : null);
      const fallbackSelected = (data && (data as any).originalMemberIds) ? (data as any).originalMemberIds : [];

      if (editId) {
        this.pubService.getPubById(editId).subscribe((p: Pub) => {
          // prefer the publication's members if present, otherwise fall back to the originalMemberIds passed by the opener
          const selected = (p as any).membres ? (p as any).membres.map((m: any) => m.id || m) : fallbackSelected;        console.debug('ArticleCreate init edit', { editId, selected, fallbackSelected, membersLoaded: this.members.length });          this.form = new FormGroup({
            type: new FormControl(p.type, Validators.required),
            titre: new FormControl(p.titre, Validators.required),
            lien: new FormControl(p.lien),
            // ensure we pick up both possible field names
            sourcePdf: new FormControl(p.sourcePdf || (p as any).sourcepdf || null),
            membres: new FormControl(selected, Validators.required)
          });
        }, err => {
          console.error('getPubById error', err);
          this.form = new FormGroup({
            type: new FormControl(null, Validators.required),
            titre: new FormControl(null, Validators.required),
            lien: new FormControl(null),
            sourcePdf: new FormControl(null),
            membres: new FormControl(fallbackSelected, Validators.required)
          });
        });
      } else {
        // fallback: treat as create if id is missing
        this.form = new FormGroup({
          type: new FormControl(null, Validators.required),
          titre: new FormControl(null, Validators.required),
          lien: new FormControl(null),
          sourcePdf: new FormControl(null),
          membres: new FormControl([], Validators.required)
        });
      }
    } else {
      // Create
      this.form = new FormGroup({
        type: new FormControl(null, Validators.required),
        titre: new FormControl(null, Validators.required),
        lien: new FormControl(null),
        sourcePdf: new FormControl(null),
        membres: new FormControl([], Validators.required)
      });
    }
  }

  private getTodayFormatted(): string {
    // send ISO date compatible with backend
    return new Date().toISOString().slice(0, 10);
  }

  // compare function for mat-select to handle object/primitive id comparisons
  compareMember(a: any, b: any) {
    if (a == null || b == null) return false;
    const aid = typeof a === 'object' ? (a.id ?? a) : a;
    const bid = typeof b === 'object' ? (b.id ?? b) : b;
    return Number(aid) === Number(bid);
  }

  save() {
    if (!this.form) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = { ...this.form.value, date: this.getTodayFormatted() };
    // map selected member ids to objects {id: N}
    const sel = raw.membres || [];
    raw.membres = sel.map((id: any) => ({ id: Number(id) }));
    console.debug('ArticleCreate save', { payload: raw });
    this.dialogRef.close(raw);
  }

  close() {
    this.dialogRef.close();
  }
}