export const Session = {
  user: null,
  client: null,

  set({ user, client }) {
    this.user = user;
    this.client = client;
  },

  clear() {
    this.user = null;
    this.client = null;
  },

  getUserId() {
    return this.user?.id || null;
  }
};
