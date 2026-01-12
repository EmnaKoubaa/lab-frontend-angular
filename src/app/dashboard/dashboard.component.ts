import { Component, OnInit } from '@angular/core';
import { MemberService } from 'src/services/member.service';
import { PubService } from 'src/services/pub.service';
import { OutilService } from 'src/services/outil.service';
import { EvtService } from 'src/services/evt.service';
import { ChartDataset, ChartOptions } from 'chart.js';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  // valeurs statiques pour l'instant (peuvent être branchées sur des services plus tard)
  labCode = 'LAB-001';
  labName = 'Laboratoire de Recherche en Informatique';
  labAddress = "École Nationale d'Ingénieurs de Sfax - ENIS - km 4 Rte de la Soukra";
  labEtablissement = 'Université de Sfax';
  labAxes = [
    'Intelligence Artificielle',
    'Systèmes d’Information',
    'Réseaux et Sécurité',
    'Ingénierie Logicielle'
  ];

  nbMembres = 0;
  nbPublications = 0;
  nbOutils = 0;
  nbEvenements = 0;

  // chart: number of articles per member
  chartData: ChartDataset[] = [ { label: 'Articles par membre', data: [] } ];
  chartLabels: string[] = [];

  // chart 2: distribution student/teacher
  chartData1: ChartDataset[] = [ { label: 'Répartition Membres', data: [] } ];
  chartLabels1: string[] = ['teacher', 'student'];
  chartOptions: ChartOptions = { responsive: true };

  private tab_pub: number[] = [];

  constructor(
    private memberService: MemberService,
    private pubService: PubService,
    private outilService: OutilService,
    private evtService: EvtService
  ) {}

  ngOnInit(): void {
    // Récupérer et compter les membres
    // and prepare charts: articles per member and distribution
    this.memberService.GetAllMembers().subscribe(members => {
      this.nbMembres = members.length;

      if (!members || members.length === 0) {
        this.chartLabels = [];
        this.chartData = [ { label: 'Articles par membre', data: [] } ];
        this.chartData1 = [ { label: 'Répartition Membres', data: [0, 0] } ];
        return;
      }

      // For each member, fetch full member (contains pubs via /fullmember/{id}) and count their publications
      const calls = members.map(m => this.memberService.getFullMemberById(String((m as any).id)).pipe(
        catchError((err: any) => {
          console.error('getFullMemberById failed for member', (m as any).id, err);
          return of(null);
        })
      ));

      forkJoin(calls).subscribe((fulls: any[]) => {
        this.chartLabels = members.map(m => `${m.nom} ${m.prenom}`);
        this.tab_pub = fulls.map(f => (f && Array.isArray(f.pubs) ? f.pubs.length : 0));
        this.chartData = [ { label: 'Articles par membre', data: this.tab_pub } ];

        // distribution teacher/student
        let nbTeacher = 0;
        let nbStudent = 0;
        members.forEach(m => {
          if ((m as any).type && (m as any).type.toLowerCase() === 'enseignant') nbTeacher++;
          else nbStudent++;
        });
        this.chartData1 = [ { label: 'Répartition Membres', data: [nbTeacher, nbStudent] } ];
      }, err => {
        console.error('Error fetching full members for charts', err);
      });

    }, err => {
      console.error('Error loading members for charts', err);
    });

    // Récupérer et compter les publications
    this.pubService.getAllPubs().subscribe(pubs => {
      this.nbPublications = pubs.length;
    });

    // Récupérer et compter les outils
    this.outilService.getAllOutils().subscribe(outils => {
      this.nbOutils = outils.length;
    });

    // Récupérer et compter les événements
    this.evtService.getAllEvents().subscribe(evts => {
      this.nbEvenements = evts.length;
    });
  }
}
