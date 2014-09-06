VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.provision :shell, path: "bootstrap.sh"
  config.vm.network :forwarded_port, host: 8081, guest: 80
  config.vm.network :private_network, type: :dhcp
  config.vm.synced_folder ".", "/vagrant", type: :nfs

  config.vm.provider "virtualbox" do |v|
    v.memory = 2048
    v.cpus = 4
  end
end
