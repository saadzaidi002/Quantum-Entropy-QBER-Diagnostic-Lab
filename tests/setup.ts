// jsdom has no canvas; the 3D scenes already skip drawing when getContext returns null.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement["getContext"];
