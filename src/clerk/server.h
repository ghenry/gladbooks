/*
 * server.h
 *
 * this file is part of GLADBOOKS
 *
 * Copyright (c) 2012, 2013 Brett Sheffield <brett@gladserv.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program (see the file COPYING in the distribution).
 * If not, see <http://www.gnu.org/licenses/>.
 */

#ifndef __GLADBOOKS_SERVER_H__
#define __GLADBOOKS_SERVER_H__ 1

#define BACKLOG 10  /* how many pending connectiong to hold in queue */
#define PROGRAM "clerkd"
#define LOCKFILE_USER ".gladbooks.pid"
#define LOCKFILE_ROOT "/var/run/gladbooks.pid"

int sock;

int server_start(char *host, char *service, int daemonize, int *pid);
int server_stop();
int server_hits();

#endif /* __GLADBOOKS_SERVER_H__ */
