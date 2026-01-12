import { Component, OnInit, ViewChild } from '@angular/core';
import { Member } from 'src/modeles/Member';
import { MemberService } from 'src/services/member.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MemberDetailDialogComponent } from '../member-detail-dialog/member-detail-dialog.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-member',
  templateUrl: './member.component.html',
  styleUrls: ['./member.component.css']
})
export class MemberComponent implements OnInit {
  dataSource: MatTableDataSource<Member>;
  displayedColumns: string[] = ['id', 'cin', 'name', 'dateNaissance', 'photo', 'cv', 'email', 'password', 'type', 'createdDate', 'actions'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private MS: MemberService, private dialog: MatDialog) {
    this.dataSource = new MatTableDataSource<Member>();
  }

  openDetails(id: string) {
    // fetch raw member (includes encadrant if student)
    this.MS.getRawMemberById(id).subscribe(member => {
      if (!member) {
        console.error('Member not found', id);
        return;
      }

      if (member.dateInscription !== undefined && member.dateInscription !== null) {
        // student -> simply open dialog and pass encadrant if present
        this.dialog.open(MemberDetailDialogComponent, { data: { member: member, students: [] } });
      } else {
        // teacher -> fetch all members and filter those with encadrant.id === teacher.id
        this.MS.getAllMembersRaw().subscribe(list => {
          const students = (list || []).filter((m: any) => m.encadrant && m.encadrant.id === member.id);
          this.dialog.open(MemberDetailDialogComponent, { data: { member: member, students: students } });
        });
      }
    }, err => {
      console.error('openDetails error', err);
    });
  }

  ngOnInit() {
    this.fetch();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  fetch() {
    this.MS.GetAllMembers().subscribe((data) => {
      // initialiser showPassword à false pour chaque membre
      data.forEach(item => (item as any).showPassword = false);
      this.dataSource.data = data;
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  delete(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      // fetch the member to determine if it's a teacher
      this.MS.getRawMemberById(id).subscribe(member => {
        if (!member) {
          // fallback: try deleting anyway
          this.MS.deleteMemberById(id).subscribe(() => this.fetch());
          return;
        }

        const isTeacher = member.dateInscription === undefined || member.dateInscription === null;
        if (!isTeacher) {
          // not a teacher, delete directly
          this.MS.deleteMemberById(id).subscribe(() => this.fetch());
          return;
        }

        // it's a teacher - find students who have this teacher as encadrant
        this.MS.getAllMembersRaw().subscribe(list => {
          const students = (list || []).filter((m: any) => m.encadrant && m.encadrant.id === member.id);

          if (!students || students.length === 0) {
            // no students - delete directly
            this.MS.deleteMemberById(id).subscribe(() => this.fetch());
            return;
          }

          // prompt the user: teacher has N students
          const msg = `Cet enseignant encadre ${students.length} étudiant(s). Si vous le supprimez, les étudiants deviendront sans encadrant. Voulez-vous continuer ?`;
          const second = this.dialog.open(ConfirmDialogComponent, { data: { message: msg } });

          second.afterClosed().subscribe(res2 => {
            if (!res2) return;

            // remove encadrant for each student, then delete teacher
            const ops = students.map(s => this.MS.removeEncadrant(String(s.id)));
            // run all and then try to remove associations (publications/events/outils) before deleting
            forkJoin(ops).subscribe(() => {
              // after students unassigned, fetch full member to find associations
              this.MS.getFullMemberById(id).subscribe(full => {
                const assocOps: any[] = [];
                const memberIdNum = Number(id);

                // publications (authors)
                if (full && full.publications && full.publications.length) {
                  full.publications.forEach((p: any) => assocOps.push(this.MS.removeAuthorFromPublication(memberIdNum, Number(p.id))));
                }

                // events
                if (full && full.evenements && full.evenements.length) {
                  full.evenements.forEach((e: any) => assocOps.push(this.MS.removeMemberFromEvent(memberIdNum, Number(e.id))));
                }
                if (full && full.events && full.events.length) {
                  full.events.forEach((e: any) => assocOps.push(this.MS.removeMemberFromEvent(memberIdNum, Number(e.id))));
                }

                // outils
                if (full && full.outils && full.outils.length) {
                  full.outils.forEach((o: any) => assocOps.push(this.MS.removeMemberFromOutil(memberIdNum, Number(o.id))));
                }

                if (assocOps.length === 0) {
                  // nothing to remove, attempt delete directly
                  this.MS.deleteMemberById(id).subscribe(() => this.fetch(), err => {
                    console.error('Error deleting member after unassign (no associations present)', err);
                    alert('Erreur lors de la suppression de l\'enseignant: ' + (err && err.message ? err.message : err));
                  });
                  return;
                }

                // remove all associations then delete
                forkJoin(assocOps).subscribe(() => {
                  this.MS.deleteMemberById(id).subscribe(() => this.fetch(), err => {
                    console.error('Error deleting member after removing associations', err);
                    alert('Erreur lors de la suppression de l\'enseignant après suppression des associations: ' + (err && err.message ? err.message : err));
                  });
                }, err => {
                  console.error('Error while removing associations for member', err);
                  alert('Impossible de supprimer certaines associations de l\'enseignant. Suppression annulée. Détails: ' + (err && err.message ? err.message : err));
                });

              }, errFull => {
                console.error('Error fetching full member for associations', errFull);
                alert('Impossible de charger les associations de l\'enseignant. Suppression annulée. Détails: ' + (errFull && errFull.message ? errFull.message : errFull));
              });

            }, err => {
              console.error('Error while unassigning students', err);
              alert('Impossible de désaffecter tous les étudiants. Suppression annulée. Détails: ' + (err && err.message ? err.message : err));
            });
          });
        });
      }, err => {
        console.error('Error fetching member before delete', err);
        // fallback: delete
        this.MS.deleteMemberById(id).subscribe(() => this.fetch());
      });
    });
  }

  togglePassword(element: any) {
    element.showPassword = !element.showPassword;
  }
}
