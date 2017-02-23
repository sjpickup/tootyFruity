import { Utility } from '../../providers/utility';
import { Notification } from '../../apiClasses/notification';
import { APIProvider } from '../../providers/APIProvider';
import { Component } from '@angular/core';
import { InfiniteScroll, NavController, NavParams } from 'ionic-angular';

/*
  Generated class for the Notifications page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  selector: 'page-notifications',
  templateUrl: 'notifications.html'
})
export class NotificationsPage {

  notifications: Notification[];

  constructor(public utility: Utility,public navCtrl: NavController, public navParams: NavParams, public mastodon: APIProvider) {
    let notificationCacheString = localStorage.getItem('notificationsCache');
    if(notificationCacheString){
      console.log('notifications loading from cache....')
      let cachedNotifications = JSON.parse(notificationCacheString);
      if(cachedNotifications.length == 0) {
        console.log('cached notifications are weird.. reloading them')
        this.getNotifications();
      } else {
        this.notifications = this.beautifyNotifications(JSON.parse(notificationCacheString));
      }
    } else {
      this.getNotifications();
    }
  }

  getNotifications(){
    this.mastodon.getNotifications().map( res => {
      let tempNotifications: Notification[] = JSON.parse(res['_body']);
      return tempNotifications;
    })
    .subscribe(
      data=>  {
        this.notifications = this.beautifyNotifications(data);
        this.cacheContent();
      },
      error => console.log(JSON.stringify(error))
    );

  }

  doRefresh(refresher) {
    let forceRefresh = localStorage.getItem('notificationRefreshNeeded');
    if(forceRefresh == 'true'){
      console.log('force reload needed in notifications because favs / boosts have changed');
      this.getNotifications();
      localStorage.setItem('notificationRefreshNeeded', 'false');
      setTimeout(() => {
            console.log('force refresh completed in notifications');
            refresher.complete();
            return;
          }, 500);
    } else {
      let id = this.notifications[0].id;
      this.mastodon.getNotifications(undefined,id)
      .map( res => {
        let tempNotifications: Notification[] = JSON.parse(res['_body']);
        return this.beautifyNotifications(tempNotifications);
      })
      .subscribe(
        data=>  {
          if(data){
            let newNotifications: Notification[] = data;
            if(newNotifications.length < 20){
              this.notifications = newNotifications.concat(this.notifications)
            } else {
              this.notifications = newNotifications;
            }
            this.cacheContent();
            setTimeout(() => {
              console.log('refresh completed');
              refresher.complete();
            }, 600);
          }
        },
        error => console.log(JSON.stringify(error))
      );
    }
  }

  loadOlderNotifications(infiniteScroll: InfiniteScroll){
    let id = this.notifications[this.notifications.length-1].id;
    this.mastodon.getNotifications(id)
    .map( res => {
      let tempNotifications: Notification[] = JSON.parse(res['_body']);
      return this.beautifyNotifications(tempNotifications);
    })
    .subscribe(
      data=>  {
        if(data){
          let newNotifications: Notification[] = data;
          for(var i = 0; i < newNotifications.length; i++){
            this.notifications.push(newNotifications[i]);
          }
          infiniteScroll.complete();
          if(data.length == 0){
            infiniteScroll.enable(false);
          }
        }
      }),
      error => {
        console.log(JSON.stringify(error))
        infiniteScroll.complete();
    }
  };

  public cacheContent(){
    localStorage.setItem('notificationsCache', JSON.stringify(this.notifications))
    console.log('notifications are cached!')
  }

  beautifyNotifications(notifications: Notification[]){
    for( let index = 0; index < notifications.length; index ++){
      if(notifications[index].status){
        notifications[index].status = this.utility.beautifyToot(notifications[index].status);
      }
  }
  return notifications;  

}
}
