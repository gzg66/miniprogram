Component({
  properties: { item: { type: Object, value: {} } },
  methods: {
    onTap() { this.triggerEvent('tapitem', { id: this.data.item.id }); },
  },
});
