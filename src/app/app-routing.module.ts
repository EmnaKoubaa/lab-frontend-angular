import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MemberFormComponent } from './member-form/member-form.component';
import { MemberComponent } from './member/member.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ToolComponent } from './tool/tool.component';
import { ArticleComponent } from './article/article.component';
import { EventComponent } from './event/event.component';
import {MatDatepickerModule} from '@angular/material/datepicker';
import { LoginComponent } from './login/login.component';

const routes: Routes = [
  {
    path: 'create',
    pathMatch: 'full',
    component: MemberFormComponent
  },
  {
    path: 'member',
    pathMatch: 'full',
    component: MemberComponent
  }, {
    path: ':id/edit', //valeur de id dynamique pour le recuperer dans le composant
    pathMatch: 'full',
    component: MemberFormComponent
  }, {
    path: 'dashboard',
    pathMatch: 'full',
    component: DashboardComponent
  }, {
    path: 'tools',
    pathMatch: 'full',
    component: ToolComponent
  }, {
    path: 'articles',
    pathMatch: 'full',
    component: ArticleComponent
  }, {
    path: 'events',
    pathMatch: 'full',
    component: EventComponent
  }, {
    path: '',
    pathMatch: 'full',
    component: LoginComponent
    /*{
      path:'', 
      redirectTo:'/member',
      pathMatch:'full'
    },*/

  }, {
    path: '**',
    component: MemberComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }