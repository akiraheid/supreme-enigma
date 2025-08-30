---
date: 2025-08-28
layout: post.pug
title: Deploy OpenWebUI To Home Lab
---

I used to host [Open WebUI](https://docs.openwebui.com/) via Podman locally on my PC using the CPU, but I'd like to upgrade to hosting it on a beefier server and get some k3s experience in.

The goals:

- Host Open WebUI and Ollama on k3s.
- Store LLM models and Open WebUI data to NFS server.

I have the NFS server available at `10.222.0.1` with `/raid/k8snfs/` exported in `/etc/exports`. Create a [Storage Class](https://kubernetes.io/docs/concepts/storage/storage-classes/) that uses the `csi-driver-nfs` installed earlier.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-csi
provisioner: nfs.csi.k8s.io
parameters:
  server: 10.222.0.1
  share: /raid/k8snfs
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
mountOptions:
  - nfsvers=4.2
```

Create a [Namespace](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/) for Ollama.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ollama
```

Create a [Persistent Volume Claim (PVC)](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims) to mount in the pod.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ollama-data
  namespace: ollama
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 200Gi
  storageClassName: nfs-csi
```

Create a [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) to manage the pods.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ollama
  namespace: ollama
  labels:
    app: ollama
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ollama
  template:
    metadata:
      labels:
        app: ollama
    spec:
      nodeSelector:
        workload-ai: "true"
      containers:
      - name: ollama
        image: docker.io/ollama/ollama:0.11.8
        env:
        - name: OLLAMA_CONTEXT_LENGTH
          value: "13000"
        ports:
        - containerPort: 11434
          name: http
        resources:
          requests:
            cpu: "5"
            memory: "10Gi"
          limits:
            cpu: "20"
            memory: "13Gi"
        volumeMounts:
          - name: ollama-data
            mountPath: /root/.ollama
            readOnly: false
      volumes:
        - name: ollama-data
          persistentVolumeClaim:
            claimName: ollama-data
```

Create a [Service](https://kubernetes.io/docs/concepts/services-networking/service/) to offer an endpoint to the pods.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ollama
  namespace: ollama
spec:
  type: LoadBalancer
  selector:
    app: ollama
  ports:
    - name: http
      port: 80
      targetPort: http
```

Create an [IngressRoute](https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/#kind-ingressrouteudp) to expose the Service to outside the cluster.

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: ollama
  namespace: ollama
spec:
  entryPoints:
    - web
  routes:
    - match: Host(`ollama.localhost`)
      kind: Rule
      services:
        - name: ollama
          port: 80
```

Check the resources.

```text
$ kubectl get all -n ollama
NAME                          READY   STATUS    RESTARTS   AGE
pod/ollama-59f5dd986b-fx5gq   0/1     Pending   0          20m

NAME             TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
service/ollama   LoadBalancer   10.43.208.81   <pending>     80:32407/TCP   20m

NAME                     READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/ollama   0/1     1            0           20m

NAME                                DESIRED   CURRENT   READY   AGE
replicaset.apps/ollama-59f5dd986b   1         1         0       20m
$ kubectl get pvc -n ollama
NAME          STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   VOLUMEATTRIBUTESCLASS   AGE
ollama-data   Pending                                      nfs-csi        <unset>                 20m
```

Looks like the PVC is failing.

```text
$ kubectl describe pvc/ollama-data -n ollama
Name:          ollama-data
Namespace:     ollama
StorageClass:  nfs-csi
Status:        Pending
Volume:
Labels:        <none>
Annotations:   volume.beta.kubernetes.io/storage-provisioner: nfs.csi.k8s.io
               volume.kubernetes.io/storage-provisioner: nfs.csi.k8s.io
Finalizers:    [kubernetes.io/pvc-protection]
Capacity:
Access Modes:
VolumeMode:    Filesystem
Used By:       ollama-59f5dd986b-fx5gq
Events:
  Type     Reason                Age                  From                                                       Message
  ----     ------                ----                 ----                                                       -------
  Normal   Provisioning          5m2s (x12 over 22m)  nfs.csi.k8s.io_gpu01_f4dc3b37-27cc-4921-bd22-dde047376118  External provisioner is provisioning volume for claim "ollama/ollama-data"
  Warning  ProvisioningFailed    5m2s (x12 over 22m)  nfs.csi.k8s.io_gpu01_f4dc3b37-27cc-4921-bd22-dde047376118  failed to provision volume with StorageClass "nfs-csi": rpc error: code = Internal desc = failed to make subdirectory: mkdir /tmp/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f: permission denied
  Normal   ExternalProvisioning  114s (x83 over 22m)  persistentvolume-controller                                Waiting for a volume to be created either by the external provisioner 'nfs.csi.k8s.io' or manually by the system administrator. If volume creation is delayed, please verify that the provisioner is running and correctly registered.
```

Check the `csi-driver-nfs`. The CSI Driver NFS repo provides some [debug tips](https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/docs/csi-debug.md).

```text
$ kubectl get pods -A | grep csi-nfs-controller
kube-system                 csi-nfs-controller-8d7689bf7-kbm8l                       5/5     Running     341 (84m ago)   10d
$ kubectl logs csi-nfs-controller-8d7689bf7-kbm8l -c nfs -n kube-system
--->8 snip 8<---
I0829 21:29:04.762466       1 utils.go:111] GRPC call: /csi.v1.Controller/CreateVolume
I0829 21:29:04.762500       1 utils.go:112] GRPC request: {"capacity_range":{"required_bytes":214748364800},"name":"pvc-b3b2e934-9e
5b-45a2-b54a-49e8dc8d9f2f","parameters":{"csi.storage.k8s.io/pv/name":"pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f","csi.storage.k8s.i
o/pvc/name":"ollama-data","csi.storage.k8s.io/pvc/namespace":"ollama","server":"10.222.0.1","share":"/raid/k8snfs"},"volume_capabil
ities":[{"AccessType":{"Mount":{"mount_flags":["nfsvers=4.2"]}},"access_mode":{"mode":5}}]}
I0829 21:29:04.762984       1 controllerserver.go:523] internally mounting 10.222.0.1:/raid/k8snfs at /tmp/pvc-b3b2e934-9e5b-45a2-b
54a-49e8dc8d9f2f
I0829 21:29:04.763192       1 nodeserver.go:133] NodePublishVolume: volumeID(10.222.0.1#raid/k8snfs#pvc-b3b2e934-9e5b-45a2-b54a-49e
8dc8d9f2f##) source(10.222.0.1:/raid/k8snfs) targetPath(/tmp/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f) mountflags([nfsvers=4.2])
I0829 21:29:04.780611       1 mount_linux.go:295] Detected OS without systemd
I0829 21:29:04.780623       1 mount_linux.go:270] Mounting cmd (mount) with arguments (-t nfs -o nfsvers=4.2 10.222.0.1:/raid/k8snf
s /tmp/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f)
I0829 21:29:04.927490       1 nodeserver.go:153] skip chmod on targetPath(/tmp/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f) since moun
tPermissions is set as 0
I0829 21:29:04.927552       1 nodeserver.go:155] volume(10.222.0.1#raid/k8snfs#pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f##) mount 10.222.0.1:/raid/k8snfs on /tmp/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f succeeded
I0829 21:29:04.938941       1 controllerserver.go:538] internally unmounting /tmp/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f
I0829 21:29:04.939000       1 nodeserver.go:176] NodeUnpublishVolume: unmounting volume 10.222.0.1#raid/k8snfs#pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f## on /tmp/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f
I0829 21:29:04.939014       1 nodeserver.go:181] force unmount 10.222.0.1#raid/k8snfs#pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f## on /tmp/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f
I0829 21:29:04.939039       1 mount_helper_common.go:56] unmounting "/tmp/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f" (corruptedMount: false, mounterCanSkipMountPointChecks: true)
I0829 21:29:04.939051       1 mount_linux.go:892] Unmounting /tmp/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f
I0829 21:29:04.948230       1 mount_helper_common.go:150] Deleting path "/tmp/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f"
I0829 21:29:04.948439       1 nodeserver.go:189] NodeUnpublishVolume: unmount volume 10.222.0.1#raid/k8snfs#pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f## on /tmp/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f successfully
E0829 21:29:04.948480       1 utils.go:116] GRPC error: rpc error: code = Internal desc = failed to make subdirectory: mkdir /tmp/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f: permission denied
```

This suggests that the CSI Driver NFS could mount the NFS path but couldn't write to the directory.

I can get around this by doing the following:

1. Create a system account on the NFS server for CSI Driver NFS pods to write as.
2. Make the exported k8s NFS path owned by the system account.
3. Convert all connections to the NFS path to the system account.

```bash
addgroup --system k8snfs
adduser --system --shell /usr/sbin/nologin --no-create-home --ingroup k8snfs k8snfs
```

Explanation of use of options:
- `--no-create-home`: System user doesn't need a home directory.
- `--shell`: Set the shell to `/usr/sbin/nologin` so that the account cannot be logged in to.
- `--system`: Use a system account range because this is not an interactive account.

Create the path to be exported and edit its ownership.

```bash
mkdir /raid/k8snfs
chown -R k8snfs:k8snfs /raid/k8snfs
```

Export the path and map the user/group ID to the created `k8snfs` user and group in `/etc/exports`.

```bash
/raid/k8snfs 10.222.0.0/24(rw,sync,no_subtree_check,all_squash,anonuid=104,anongid=104)
```

Update the exported file systems.

```bash
exportfs -ra
```

Check the CSI Driver NFS container again.

```text
$ kubectl logs csi-nfs-controller-8d7689bf7-kbm8l -c nfs -n kube-system
--->8 snip 8<---
I0830 02:04:19.280624       1 utils.go:118] GRPC response: {"volume":{"volume_context":{"csi.storage.k8s.io/pv/name":"pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f","csi.storage.k8s.io/pvc/name":"ollama-data","csi.storage.k8s.io/pvc/namespace":"ollama","server":"10.222.0.1","share":"/raid/k8snfs","subdir":"pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f"},"volume_id":"10.222.0.1#raid/k8snfs#pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f##"}}
```

No errors, so checking the PVC again.

```text
$ kubectl describe pvc/ollama-data -n ollama
Name:          ollama-data
Namespace:     ollama
StorageClass:  nfs-csi
Status:        Bound
Volume:        pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f
Labels:        <none>
Annotations:   pv.kubernetes.io/bind-completed: yes
               pv.kubernetes.io/bound-by-controller: yes
               volume.beta.kubernetes.io/storage-provisioner: nfs.csi.k8s.io
               volume.kubernetes.io/storage-provisioner: nfs.csi.k8s.io
Finalizers:    [kubernetes.io/pvc-protection]
Capacity:      200Gi
Access Modes:  RWX
VolumeMode:    Filesystem
Used By:       ollama-59f5dd986b-fx5gq
Events:
  Type     Reason                 Age                   From                                                       Message
  ----     ------                 ----                  ----                                                       -------
  Normal   Provisioning           19m (x7 over 20m)     nfs.csi.k8s.io_gpu01_bb71c1d1-b790-459a-996d-18f99f358e39  External provisioner is provisioning volume for claim "ollama/ollama-data"
  Warning  ProvisioningFailed     19m (x7 over 20m)     nfs.csi.k8s.io_gpu01_bb71c1d1-b790-459a-996d-18f99f358e39  failed to provision volume with StorageClass "nfs-csi": rpc error: code = Internal desc = failed to make subdirectory: mkdir /tmp/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f: permission denied
  Warning  ProvisioningFailed     13m (x9 over 18m)     nfs.csi.k8s.io_gpu01_bd743c6b-1d59-40aa-9ba6-c250fc16a5cc  failed to provision volume with StorageClass "nfs-csi": rpc error: code = Internal desc = failed to make subdirectory: mkdir /tmp/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f/pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f: permission denied
  Normal   ExternalProvisioning   11m (x26 over 17m)    persistentvolume-controller                                Waiting for a volume to be created either by the external provisioner 'nfs.csi.k8s.io' or manually by the system administrator. If volume creation is delayed, please verify that the provisioner is running and correctly registered.
  Normal   Provisioning           9m35s (x10 over 18m)  nfs.csi.k8s.io_gpu01_bd743c6b-1d59-40aa-9ba6-c250fc16a5cc  External provisioner is provisioning volume for claim "ollama/ollama-data"
  Normal   ProvisioningSucceeded  9m32s                 nfs.csi.k8s.io_gpu01_bd743c6b-1d59-40aa-9ba6-c250fc16a5cc  Successfully provisioned volume pvc-b3b2e934-9e5b-45a2-b54a-49e8dc8d9f2f
```

PVC looks good. Check the Ollama resources.

```text
$ kubectl get all -n ollama
NAME                          READY   STATUS    RESTARTS   AGE
pod/ollama-59f5dd986b-fx5gq   1/1     Running   0          4h46m

NAME             TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
service/ollama   LoadBalancer   10.43.208.81   <pending>     80:32407/TCP   4h46m

NAME                     READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/ollama   1/1     1            1           4h46m

NAME                                DESIRED   CURRENT   READY   AGE
replicaset.apps/ollama-59f5dd986b   1         1         1       4h46m
```

Looks good. I can verify that the URL also resolves.

```text
$ curl ollama.localhost
Ollama is running
```

Now to deploy Open WebUI.

Create the Namespace.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: open-webui
```

Create the PVC.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: open-webui
  namespace: open-webui
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: local-path
```

Create the Deployment.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: open-webui
  namespace: open-webui
  labels:
    app: open-webui
spec:
  replicas: 1
  selector:
    matchLabels:
      app: open-webui
  template:
    metadata:
      labels:
        app: open-webui
    spec:
      containers:
      - name: open-webui
        image: ghcr.io/open-webui/open-webui:v0.6.26
        env:
        - name: K8S_FLAG
          value: "true"
        - name: OLLAMA_BASE_URLS
          value: "http://ollama.ollama.svc.cluster.local"
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "1"
            memory: "5Gi"
        ports:
        - containerPort: 8080
          name: frontend
        volumeMounts:
        - name: open-webui
          mountPath: /app/backend/data
      volumes:
      - name: open-webui
        persistentVolumeClaim:
          claimName: open-webui
```

Create the Service.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: open-webui
  namespace: open-webui
spec:
  type: LoadBalancer
  selector:
    app: open-webui
  ports:
    - name: frontend
      port: 80
      targetPort: frontend
```

Create the IngressRoute.

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: open-webui
  namespace: open-webui
spec:
  entryPoints:
    - web
  routes:
    - match: Host(`open-webui.localhost`)
      kind: Rule
      services:
        - name: open-webui
          port: 80
```

Check the resources.

```text
$ kubectl get all -n open-webui
NAME                              READY   STATUS    RESTARTS   AGE
pod/open-webui-667b64bdd7-x2grr   1/1     Running   0          3m14s

NAME                 TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
service/open-webui   LoadBalancer   10.43.180.46   <pending>     80:30873/TCP   3m16s

NAME                         READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/open-webui   1/1     1            1           3m15s

NAME                                    DESIRED   CURRENT   READY   AGE
replicaset.apps/open-webui-667b64bdd7   1         1         1       3m15s
```

Looks good and I can access the website at `http://open-webui.localhost`.
