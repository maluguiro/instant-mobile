import { Platform } from 'react-native';
import { NativeModulesProxy } from 'expo-modules-core';

import { getAppSettings } from '@/lib/app-settings';
import { getFinanceSettings } from '@/lib/finance-settings';
import { getDueDates, getInstallments, getRecurringPayments } from '@/lib/calendar';
import { formatCurrency } from '@/lib/finance';

type NotificationModule = typeof import('expo-notifications');

let cachedModule: NotificationModule | null | undefined;

function hasNativeNotificationsModule() {
  return Boolean(NativeModulesProxy?.ExpoPushTokenManager);
}

function getNotificationsModule(): NotificationModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS === 'web') return null;
  if (!hasNativeNotificationsModule()) {
    cachedModule = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedModule = require('expo-notifications');
    return cachedModule ?? null;
  } catch {
    cachedModule = null;
    return null;
  }
}

export function getNotifications() {
  return getNotificationsModule();
}

export async function requestNotificationsPermission(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

function dateAtHour(dateStr: string, hours = 9, minutes = 0) {
  const date = new Date(dateStr + 'T00:00:00');
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function parseTime(value: string) {
  const parts = value.split(':');
  const hours = Math.min(Math.max(Number(parts[0] || 0), 0), 23);
  const minutes = Math.min(Math.max(Number(parts[1] || 0), 0), 59);
  return { hours, minutes };
}

function nextWeekdayDate(weekday: number, hour = 9, minutes = 0) {
  const today = new Date();
  const base = new Date(today);
  base.setHours(hour, minutes, 0, 0);
  const delta = (weekday - today.getDay() + 7) % 7;
  base.setDate(today.getDate() + delta);
  if (base.getTime() <= Date.now()) {
    base.setDate(base.getDate() + 7);
  }
  return base;
}

function nextMonthlyDate(day: number, hour = 9, minutes = 0) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const maxDay = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(Math.max(day, 1), maxDay);
  const date = new Date(year, month, safeDay, hour, minutes, 0, 0);
  if (date.getTime() <= Date.now()) {
    const nextMonth = month + 1;
    const nextMax = new Date(year, nextMonth + 1, 0).getDate();
    const nextSafe = Math.min(Math.max(day, 1), nextMax);
    return new Date(year, nextMonth, nextSafe, hour, minutes, 0, 0);
  }
  return date;
}

function nextEveryXDate(days: number, hour = 9, minutes = 0) {
  const base = new Date();
  base.setHours(hour, minutes, 0, 0);
  base.setDate(base.getDate() + Math.max(days, 1));
  return base;
}

async function scheduleAtDate(
  date: Date,
  title: string,
  body: string,
  data: Record<string, unknown>,
  categoryIdentifier?: string
) {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  const now = Date.now();
  if (date.getTime() <= now) {
    const soon = new Date(now + 5 * 60 * 1000);
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, categoryIdentifier },
      trigger: soon,
    });
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, categoryIdentifier },
    trigger: date,
  });
}

export async function scheduleSnoozeNotification(
  content: { title: string; body: string; data?: Record<string, unknown>; categoryIdentifier?: string },
  trigger: Date
) {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content,
    trigger,
  });
}

export async function scheduleLocalNotifications(): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  const settings = await getAppSettings();
  const hasEnabled =
    settings.notifications.dueDates ||
    settings.notifications.weekly ||
    settings.notifications.savings ||
    settings.notifications.installments ||
    settings.notifications.importantEnabled;

  if (!hasEnabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }

  const granted = await requestNotificationsPermission();
  if (!granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Instant',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  const finance = await getFinanceSettings();
  const dueDates = await getDueDates();
  const recurring = await getRecurringPayments();
  const installments = await getInstallments();
  const categoryId = settings.notifications.snoozeEnabled ? 'instant-snooze' : undefined;
  const dueTime = parseTime(settings.notifications.times.dueDates);
  const weeklyTime = parseTime(settings.notifications.times.weekly);
  const savingsTime = parseTime(settings.notifications.times.savings);
  const installmentTime = parseTime(settings.notifications.times.installments);
  const dueAdvance = Math.max(settings.notifications.advanceDays.dueDates, 0);
  const weeklyAdvance = Math.max(settings.notifications.advanceDays.weekly, 0);
  const savingsAdvance = Math.max(settings.notifications.advanceDays.savings, 0);
  const installmentAdvance = Math.max(settings.notifications.advanceDays.installments, 0);
  const importantTime = parseTime(settings.notifications.important.time);
  const importantAdvance = Math.max(settings.notifications.important.advanceDays, 0);
  const importantRepeat = Math.max(settings.notifications.important.repeatDays, 0);

  const useImportant = settings.notifications.importantEnabled;

  if (settings.notifications.dueDates) {
    for (const item of dueDates.filter((entry) => entry.status !== 'paid')) {
      if (item.important && useImportant) continue;
      const date = dateAtHour(item.date, dueTime.hours, dueTime.minutes);
      date.setDate(date.getDate() - dueAdvance);
      const daysLeft = Math.ceil((date.getTime() - Date.now()) / 86400000);
      const title =
        daysLeft <= 0 ? 'Pago de hoy' : daysLeft <= 2 ? 'Vencimiento próximo' : 'Próximo vencimiento';
      const body = `${item.name} · ${formatCurrency(item.amount, item.currency)}`;
      await scheduleAtDate(
        date,
        title,
        body,
        {
          route: '/(tabs)/calendar',
          params: { tab: 'due' },
        },
        categoryId
      );
    }

    for (const item of recurring.filter((entry) => entry.status !== 'ended' && entry.status !== 'paused')) {
      if (item.important && useImportant) continue;
      const date = dateAtHour(item.nextDate, dueTime.hours, dueTime.minutes);
      date.setDate(date.getDate() - dueAdvance);
      const title = 'Pago recurrente';
      const body = `${item.name} · ${formatCurrency(item.amount, item.currency)}`;
      await scheduleAtDate(
        date,
        title,
        body,
        {
          route: '/(tabs)/calendar',
          params: { tab: 'recurring' },
        },
        categoryId
      );
    }
  }

  if (settings.notifications.installments) {
    for (const item of installments.filter((entry) => entry.status !== 'completed')) {
      if (item.important && useImportant) continue;
      const date = dateAtHour(item.nextDate, installmentTime.hours, installmentTime.minutes);
      date.setDate(date.getDate() - installmentAdvance);
      const title = 'Próxima cuota';
      const body = `${item.name} · ${formatCurrency(item.amount, item.currency)} · ${item.current}/${item.total}`;
      await scheduleAtDate(
        date,
        title,
        body,
        {
          route: '/(tabs)/calendar',
          params: { tab: 'installments' },
        },
        categoryId
      );
    }
  }

  if (settings.notifications.importantEnabled) {
    for (const item of dueDates.filter((entry) => entry.status !== 'paid' && entry.important)) {
      const date = dateAtHour(item.date, importantTime.hours, importantTime.minutes);
      date.setDate(date.getDate() - importantAdvance);
      await scheduleAtDate(
        date,
        'Vencimiento importante',
        `${item.name} · ${formatCurrency(item.amount, item.currency)}`,
        { route: '/(tabs)/calendar', params: { tab: 'due' } },
        categoryId
      );
      if (importantRepeat > 0) {
        const repeatDate = dateAtHour(item.date, importantTime.hours, importantTime.minutes);
        repeatDate.setDate(repeatDate.getDate() + importantRepeat);
        await scheduleAtDate(
          repeatDate,
          'Pago pendiente',
          `${item.name} · ${formatCurrency(item.amount, item.currency)}`,
          { route: '/(tabs)/calendar', params: { tab: 'due' } },
          categoryId
        );
      }
    }

    for (const item of recurring.filter(
      (entry) => entry.status !== 'ended' && entry.status !== 'paused' && entry.important
    )) {
      const date = dateAtHour(item.nextDate, importantTime.hours, importantTime.minutes);
      date.setDate(date.getDate() - importantAdvance);
      await scheduleAtDate(
        date,
        'Pago importante',
        `${item.name} · ${formatCurrency(item.amount, item.currency)}`,
        { route: '/(tabs)/calendar', params: { tab: 'recurring' } },
        categoryId
      );
    }

    for (const item of installments.filter((entry) => entry.status !== 'completed' && entry.important)) {
      const date = dateAtHour(item.nextDate, importantTime.hours, importantTime.minutes);
      date.setDate(date.getDate() - importantAdvance);
      await scheduleAtDate(
        date,
        'Cuota importante',
        `${item.name} · ${formatCurrency(item.amount, item.currency)} · ${item.current}/${item.total}`,
        { route: '/(tabs)/calendar', params: { tab: 'installments' } },
        categoryId
      );
      if (importantRepeat > 0) {
        const repeatDate = dateAtHour(item.nextDate, importantTime.hours, importantTime.minutes);
        repeatDate.setDate(repeatDate.getDate() + importantRepeat);
        await scheduleAtDate(
          repeatDate,
          'Cuota pendiente',
          `${item.name} · ${formatCurrency(item.amount, item.currency)} · ${item.current}/${item.total}`,
          { route: '/(tabs)/calendar', params: { tab: 'installments' } },
          categoryId
        );
      }
    }
  }

  if (settings.notifications.weekly && finance.weeklyMode !== 'manual') {
    let weeklyDate: Date | null = null;
    if (finance.weeklyRenewal === 'manual') {
      weeklyDate = null;
    } else if (finance.weeklyRenewal === 'everyX') {
      weeklyDate = nextEveryXDate(finance.weeklyEveryDays, weeklyTime.hours, weeklyTime.minutes);
    } else if (finance.weeklyRenewal === 'custom') {
      weeklyDate = nextWeekdayDate(finance.weeklyCustomDay, weeklyTime.hours, weeklyTime.minutes);
    } else {
      weeklyDate = nextWeekdayDate(1, weeklyTime.hours, weeklyTime.minutes);
    }

    if (weeklyDate) {
      weeklyDate.setDate(weeklyDate.getDate() - weeklyAdvance);
      await scheduleAtDate(
        weeklyDate,
        'Disponible semanal listo',
        'Podés revisar tu plan semanal.',
        { route: '/(tabs)/budget', params: { tab: 'Semanal' } },
        categoryId
      );
    }
  }

  if (settings.notifications.savings && finance.savingsMode !== 'manual') {
    let savingsDate: Date | null = null;
    if (finance.savingsFrequency === 'weekly') {
      savingsDate = nextWeekdayDate(finance.savingsWeekday, savingsTime.hours, savingsTime.minutes);
    } else if (finance.savingsFrequency === 'everyX') {
      savingsDate = nextEveryXDate(finance.savingsEveryDays, savingsTime.hours, savingsTime.minutes);
    } else if (finance.savingsFrequency === 'manual') {
      savingsDate = null;
    } else {
      savingsDate = nextMonthlyDate(finance.savingsMonthDay, savingsTime.hours, savingsTime.minutes);
    }

    if (savingsDate) {
      savingsDate.setDate(savingsDate.getDate() - savingsAdvance);
      await scheduleAtDate(
        savingsDate,
        'Ahorro programado',
        'Es un buen momento para reservar tu ahorro.',
        { route: '/(tabs)/budget', params: { tab: 'Ahorro' } },
        categoryId
      );
    }
  }
}

