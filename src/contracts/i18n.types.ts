export type SupportedLocale = 'en' | 'pt-BR' | 'es';

export type LanguagePreference = 'system' | SupportedLocale;

export type DeepReadonly<T> = T extends string | number | boolean | null | undefined
  ? T
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : { readonly [K in keyof T]: DeepReadonly<T[K]> };

interface MutableTranslationSchema {
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    back: string;
    loading: string;
    error: string;
    success: string;
    create: string;
    settings: string;
    tasks: string;
  };
  nav: {
    createButton: string;
    allTasks: string;
    starred: string;
    lists: string;
    newList: string;
    hideFromBoard: string;
    showOnBoard: string;
    connectGoogle: string;
    connectedAs: string;
  };
  board: {
    noListsSelected: string;
    noListsSelectedDesc: string;
    showAllLists: string;
  };
  lists: {
    listOptions: string;
    sortBy: string;
    sortMyOrder: string;
    sortDate: string;
    sortDeadline: string;
    sortStarred: string;
    sortTitle: string;
    renameList: string;
    deleteList: string;
    cannotDeleteDefaultList: string;
    printList: string;
    clearCompletedTasks: string;
    addTask: string;
    noTasks: string;
    noTasksYet: string;
    addTaskPrompt: string;
    noStarredTasks: string;
    noStarredTasksDesc: string;
    allTasksCompleted: string;
    goodJob: string;
    completedHeader: string;
    renameDialogTitle: string;
    deleteDialogTitle: string;
    deleteDialogConfirm: string;
    deleteDialogDesc: string;
    markOldCompleted: string;
  };
  taskModal: {
    createTitle: string;
    editTitle: string;
    titlePlaceholder: string;
    addDateTime: string;
    allDay: string;
    recurrenceNone: string;
    recurrenceDaily: string;
    recurrenceWeekly: string;
    recurrenceMonthly: string;
    recurrenceAnnually: string;
    addDescription: string;
    listLabel: string;
    subtasksTitle: string;
    addSubtask: string;
    subtaskPlaceholder: string;
    promoteSubtask: string;
    deleteSubtask: string;
    deleteTask: string;
    emailFrom: string;
    integrationsTitle: string;
    openInWeb: string;
    assignedInDocs: string;
    assignedInChat: string;
  };
  contextMenu: {
    editTask: string;
    addAttachment: string;
    delete: string;
    newList: string;
    markCompleted: string;
    markIncomplete: string;
    dueToday: string;
    dueTomorrow: string;
    pickDate: string;
    removeDueDate: string;
    moveToList: string;
    openInWeb: string;
    openInGmail: string;
    deleteTask: string;
  };
  dateTime: {
    today: string;
    tomorrow: string;
    nextWeek: string;
    chooseDate: string;
    removeDate: string;
    setDueDateTitle: string;
    addTime: string;
    removeTime: string;
  };
  taskCard: {
    details: string;
    markCompleted: string;
    markIncomplete: string;
    completedAt: string;
    nextDue: string;
    subtasksCount: string;
    hasDetails: string;
    starTask: string;
    unstarTask: string;
    overdue: string;
    taskOptions: string;
    dragToReorder: string;
    removeRecurrence: string;
  };
  settings: {
    title: string;
    appearance: string;
    theme: string;
    themeSystem: string;
    themeLight: string;
    themeDark: string;
    fontSize: string;
    fontSmall: string;
    fontNormal: string;
    fontLarge: string;
    language: string;
    langSystem: string;
    langEn: string;
    langPt: string;
    langEs: string;
    account: string;
    connectedWithGoogle: string;
    disconnectGoogle: string;
    syncTitle: string;
    syncDesc: string;
    cloudKeysAdvanced: string;
    customClientId: string;
    customClientSecret: string;
    saveKeys: string;
    keysSaved: string;
    notificationsTitle: string;
    notificationsActiveBadge: string;
    notificationsEnabledDesc: string;
    notificationsDisabledDesc: string;
    testNotificationBtn: string;
    testNotificationSuccess: string;
    systemTitle: string;
    startOnBootTitle: string;
    startOnBootDesc: string;
    cloudSync: string;
    cloudSyncDesc: string;
    syncNow: string;
    syncing: string;
    lastSynced: string;
    syncNever: string;
    syncSuccess: string;
  };
  login: {
    appTitle: string;
    tagline: string;
    connectionSettings: string;
    signInWithGoogle: string;
    waitingLogin: string;
  };
  titlebar: {
    sync: string;
    minimize: string;
    maximize: string;
    restore: string;
    close: string;
  };
}

export type TranslationSchema = DeepReadonly<MutableTranslationSchema>;
