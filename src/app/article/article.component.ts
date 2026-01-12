import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { PubService } from 'src/services/pub.service';
import { ArticleCreateComponent } from '../article-create/article-create.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { Pub } from 'src/modeles/Pub';
import { ResourceSyncService } from 'src/services/resource-sync.service';
import { MemberService } from 'src/services/member.service';

@Component({
  selector: 'app-article',
  templateUrl: './article.component.html',
  styleUrls: ['./article.component.css']
})
export class ArticleComponent implements AfterViewInit {
  displayedColumns: string[] = ['id', 'type', 'titre', 'date', 'lien', 'sourcePdf', 'actions'];
  dataSource: MatTableDataSource<Pub>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private pubService: PubService, private dialog: MatDialog, private rs: ResourceSyncService, private MS: MemberService) {
    this.dataSource = new MatTableDataSource<Pub>();
  }

  ngAfterViewInit(): void {
    this.loadData();
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadData() {
    this.pubService.getAllPubs().subscribe((res) => {
      this.dataSource.data = res;
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openCreate() {
    const dialogRef = this.dialog.open(ArticleCreateComponent);

    dialogRef.afterClosed().subscribe((data) => {
      if (data) {
        this.pubService.addPub(data).subscribe((res:any) => {
          if (res) {
            this.loadData();
            // Prefer the member selection from the dialog because the backend may not immediately return members on create
            const memberIds = (data && data.membres ? data.membres.map((m:any) => Number(m.id ?? m)) : []);
            // persist associations in member service
            if (memberIds.length) {
              this.MS.affectAuthorsToPublication(res.id, memberIds).subscribe(() => {
                // notify UI after associations saved
                this.rs.emit({ type: 'pub', memberIds });
              }, (err: any) => {
                console.error('Failed to persist author associations', err);
                // still notify so UI refreshes; backend may already have associations
                this.rs.emit({ type: 'pub', memberIds });
              });
              // cache members locally as a fallback for immediate edit flows
              this.pubService.setMembersForPub(res.id, memberIds);
            }
          } else {
            alert('Erreur lors de la création de la publication.');
          }
        }, err => {
          console.error('addPub failed', err);
          alert('Erreur lors de la création de la publication.');
        });
      }
    });
  }

  openEdit(id: number) {
    // first fetch original publication to know previous member assignments
    this.pubService.getPubById(String(id)).subscribe((orig:any) => {
      let originalMemberIds = orig && orig.membres ? (orig.membres.map((m:any) => Number(m.id))) : [];
      if (!originalMemberIds.length) {
        const cached = this.pubService.getMembersForPub(Number(id));
        if (cached && cached.length) originalMemberIds = cached;
      }

      const dialogConfig = new MatDialogConfig();
      dialogConfig.data = { id: String(id), originalMemberIds };

      const dialogRef = this.dialog.open(ArticleCreateComponent, dialogConfig);

      dialogRef.afterClosed().subscribe((data) => {
        if (data) {
          this.pubService.updatePub(String(id), data).subscribe(() => {
            this.loadData();
            // Use the dialog result to determine new members because backend may not return them on update
            const newMemberIds = (data && data.membres ? data.membres.map((m:any)=>Number(m.id ?? m)) : []);

            const added = newMemberIds.filter((n:number) => originalMemberIds.indexOf(n) === -1);
            const removed = originalMemberIds.filter((o:number) => newMemberIds.indexOf(o) === -1);

            // persist added associations
            if (added.length) {
              this.MS.affectAuthorsToPublication(Number(id), added).subscribe(() => {
                // notify affected members
                const notify = Array.from(new Set([...added, ...removed]));
                if (notify.length) this.rs.emit({ type: 'pub', memberIds: notify });
              }, (err: any) => {
                console.error('Failed to persist added authors', err);
                const notify = Array.from(new Set([...added, ...removed]));
                if (notify.length) this.rs.emit({ type: 'pub', memberIds: notify });
              });
            } else {
              const notify = Array.from(new Set([...added, ...removed]));
              if (notify.length) this.rs.emit({ type: 'pub', memberIds: notify });
            }

            // update cache and remove associations if backend supports it (best-effort)
            this.pubService.setMembersForPub(Number(id), newMemberIds);
            removed.forEach((rid: number) => {
              this.MS.removeAuthorFromPublication(rid, Number(id)).subscribe(() => {}, () => {});
            });

          });
        }
      });
    });
  }

  delete(id: number) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      //height: '200px',
      //width: '300px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // fetch pub before delete to know which members to refresh
        this.pubService.getPubById(String(id)).subscribe((p) => {
          const memberIds = (p as any).membres ? (p as any).membres.map((m: any) => Number(m.id)) : [];
          this.pubService.deletePubById(String(id)).subscribe(() => {
            this.loadData();
            if (memberIds.length) this.rs.emit({ type: 'pub', memberIds });
          });
        }, err => {
          // fallback: delete without member notification
          this.pubService.deletePubById(String(id)).subscribe(() => this.loadData());
        });
      }
    });
  }
  
}