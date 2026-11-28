import ContactsUI
import ExpoModulesCore

public class ProfileContactPickerModule: Module, CNContactPickerDelegate {
  private var pending: Promise?
  private var picker: CNContactPickerViewController?

  public func definition() -> ModuleDefinition {
    Name("ProfileContactPicker")

    AsyncFunction("pickContact") { (promise: Promise) in
      DispatchQueue.main.async {
        self.pending?.resolve(nil)
        guard let presenter = self.appContext?.utilities?.currentViewController() else {
          promise.reject("E_CONTACT_PICKER", "Could not open contacts")
          return
        }
        let picker = CNContactPickerViewController()
        picker.delegate = self
        picker.displayedPropertyKeys = [CNContactPhoneNumbersKey]
        picker.predicateForSelectionOfContact = NSPredicate(value: false)
        picker.predicateForSelectionOfProperty = NSPredicate(value: true)
        self.pending = promise
        self.picker = picker
        presenter.present(picker, animated: true)
      }
    }
  }

  public func contactPicker(_ picker: CNContactPickerViewController, didSelect contactProperty: CNContactProperty) {
    let contact = contactProperty.contact
    let name = CNContactFormatter.string(from: contact, style: .fullName)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let phone = (contactProperty.value as? CNPhoneNumber)?.stringValue.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    pending?.resolve(name.isEmpty || phone.isEmpty ? nil : ["name": String(name.prefix(200)), "phone": String(phone.prefix(200))])
    pending = nil
    self.picker = nil
  }

  public func contactPickerDidCancel(_ picker: CNContactPickerViewController) {
    pending?.resolve(nil)
    pending = nil
    self.picker = nil
  }
}
